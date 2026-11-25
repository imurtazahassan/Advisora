import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg'; import { randomBytes,randomUUID,createPublicKey,verify as verifySignature } from 'node:crypto'; import { PG_POOL } from '../database/database.module'; import { evaluateTrancheAuthorization } from './execution.policy'; import { EXCHANGE_EXECUTION_PORT } from '../exchange/exchange-execution.port'; import type { ExchangeExecutionPort } from '../exchange/exchange-execution.port';
@Injectable() export class ExecutionService implements OnModuleInit,OnModuleDestroy { private timer?:ReturnType<typeof setInterval>; constructor(@Inject(PG_POOL) private readonly pool:Pool,@Inject(EXCHANGE_EXECUTION_PORT) private readonly exchange:ExchangeExecutionPort){}
 onModuleInit(){this.timer=setInterval(()=>{void this.advanceAll().catch(()=>undefined);},5000);}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 private async advanceAll() {
  // The 60-second authorization window is anchored to scheduled_at, not to
  // when a worker happens to wake up. This prevents downtime from creating
  // a fresh authorization window for a tranche that was already missed.
  const opened = await this.pool.query(`
    WITH due AS (
      UPDATE investment_tranches t
      SET status='AUTHORIZATION_OPEN',
          authorization_expires_at=t.scheduled_at + INTERVAL '60 seconds'
      FROM investment_plans p
      WHERE t.plan_id=p.id AND p.status='ACTIVE'
        AND t.status='SCHEDULED'
        AND t.scheduled_at <= NOW()
        AND t.scheduled_at + INTERVAL '60 seconds' >= NOW()
      RETURNING p.user_id,p.id AS plan_id,t.id AS tranche_id,t.tranche_number,t.authorization_expires_at
    )
    INSERT INTO notification_outbox(user_id,event_type,channel,payload)
    SELECT user_id,'TRANCHE_AUTHORIZATION_OPEN','IN_APP',
      jsonb_build_object('plan_id',plan_id,'tranche_id',tranche_id,'tranche_number',tranche_number,
                         'expires_at',authorization_expires_at,'expires_in_seconds',
                         GREATEST(0,CEIL(EXTRACT(EPOCH FROM (authorization_expires_at-NOW())))))
    FROM due
    RETURNING id
  `);
  const missed = await this.pool.query(`
    WITH skipped AS (
      UPDATE investment_tranches t SET status='SKIPPED'
      FROM investment_plans p
      WHERE t.plan_id=p.id AND p.status='ACTIVE' AND t.status='SCHEDULED'
        AND t.scheduled_at + INTERVAL '60 seconds' < NOW()
      RETURNING p.user_id,t.id AS tranche_id,t.tranche_number
    )
    INSERT INTO notification_outbox(user_id,event_type,channel,payload)
    SELECT user_id,'TRANCHE_SKIPPED_MISSED','IN_APP',
      jsonb_build_object('tranche_id',tranche_id,'tranche_number',tranche_number,'reason','SCHEDULED_WINDOW_MISSED')
    FROM skipped RETURNING id
  `);
  const expired = await this.pool.query(`
    WITH skipped AS (
      UPDATE investment_tranches t SET status='SKIPPED',authorization_expires_at=NULL
      FROM investment_plans p
      WHERE t.plan_id=p.id AND t.status='AUTHORIZATION_OPEN'
        AND t.authorization_expires_at < NOW()
      RETURNING p.user_id,t.id AS tranche_id,t.tranche_number
    )
    INSERT INTO notification_outbox(user_id,event_type,channel,payload)
    SELECT user_id,'TRANCHE_SKIPPED_EXPIRED','IN_APP',
      jsonb_build_object('tranche_id',tranche_id,'tranche_number',tranche_number,'reason','AUTHORIZATION_WINDOW_EXPIRED')
    FROM skipped RETURNING id
  `);
  return { opened: opened.rowCount ?? 0, missed: missed.rowCount ?? 0, expired: expired.rowCount ?? 0 };
 }
 async tick(userId:string){
  // User-triggered scheduler inspection follows the same server-side time rules.
  const opened = await this.pool.query(`
    WITH due AS (
      UPDATE investment_tranches t
      SET status='AUTHORIZATION_OPEN', authorization_expires_at=t.scheduled_at + INTERVAL '60 seconds'
      FROM investment_plans p
      WHERE t.plan_id=p.id AND p.user_id=$1 AND p.status='ACTIVE'
        AND t.status='SCHEDULED' AND t.scheduled_at<=NOW()
        AND t.scheduled_at + INTERVAL '60 seconds' >= NOW()
      RETURNING t.id,t.tranche_number,p.id AS plan_id,t.authorization_expires_at
    )
    INSERT INTO notification_outbox(user_id,event_type,channel,payload)
    SELECT $1,'TRANCHE_AUTHORIZATION_OPEN','IN_APP',
      jsonb_build_object('plan_id',plan_id,'tranche_id',id,'tranche_number',tranche_number,
                         'expires_at',authorization_expires_at,'expires_in_seconds',
                         GREATEST(0,CEIL(EXTRACT(EPOCH FROM (authorization_expires_at-NOW())))))
    FROM due RETURNING id
  `,[userId]);
  const missed = await this.pool.query(`
    WITH skipped AS (
      UPDATE investment_tranches t SET status='SKIPPED'
      FROM investment_plans p
      WHERE t.plan_id=p.id AND p.user_id=$1 AND p.status='ACTIVE'
        AND t.status='SCHEDULED' AND t.scheduled_at + INTERVAL '60 seconds' < NOW()
      RETURNING t.id,t.tranche_number
    )
    INSERT INTO notification_outbox(user_id,event_type,channel,payload)
    SELECT $1,'TRANCHE_SKIPPED_MISSED','IN_APP',
      jsonb_build_object('tranche_id',id,'tranche_number',tranche_number,'reason','SCHEDULED_WINDOW_MISSED')
    FROM skipped RETURNING id
  `,[userId]);
  const expired = await this.pool.query(`
    WITH skipped AS (
      UPDATE investment_tranches t SET status='SKIPPED',authorization_expires_at=NULL
      FROM investment_plans p
      WHERE t.plan_id=p.id AND p.user_id=$1 AND t.status='AUTHORIZATION_OPEN'
        AND t.authorization_expires_at<NOW()
      RETURNING t.id,t.tranche_number
    )
    INSERT INTO notification_outbox(user_id,event_type,channel,payload)
    SELECT $1,'TRANCHE_SKIPPED_EXPIRED','IN_APP',
      jsonb_build_object('tranche_id',id,'tranche_number',tranche_number,'reason','AUTHORIZATION_WINDOW_EXPIRED')
    FROM skipped RETURNING id
  `,[userId]);
  return {
    authorization_windows_opened: opened.rowCount ?? 0,
    missed_tranches_skipped: missed.rowCount ?? 0,
    expired_tranches_skipped: expired.rowCount ?? 0,
    executed_automatically:0,
    message:'Scheduler never executes trades. Each open tranche requires fresh explicit user authorization.'
  };
 }
 async challenge(userId:string,trancheId:string,deviceId:string){
  const t=await this.pool.query(`SELECT t.id,t.status,t.authorization_expires_at,p.status plan_status,p.symbol FROM investment_tranches t JOIN investment_plans p ON p.id=t.plan_id WHERE t.id=$1 AND p.user_id=$2`,[trancheId,userId]); if(!t.rowCount) throw new NotFoundException('Tranche not found'); const row=t.rows[0];
  if(row.status!=='AUTHORIZATION_OPEN'||row.plan_status!=='ACTIVE'||!row.authorization_expires_at||new Date(row.authorization_expires_at).getTime()<Date.now()) throw new ConflictException('Tranche is not inside an active authorization window.');
  const d=await this.pool.query(`SELECT id FROM user_devices WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL`,[deviceId,userId]); if(!d.rowCount) throw new UnauthorizedException('Active registered device required.');
  const id=randomUUID(),nonce=randomBytes(32).toString('base64url'),expires=new Date(Math.min(new Date(row.authorization_expires_at).getTime(),Date.now()+60000)); const challenge=JSON.stringify({nonce,tranche_id:trancheId,expires_at:expires.toISOString()});
  await this.pool.query(`INSERT INTO tranche_authorization_challenges(id,user_id,tranche_id,device_id,challenge,expires_at) VALUES($1,$2,$3,$4,$5,$6)`,[id,userId,trancheId,deviceId,challenge,expires]);
  return {challenge_id:id,challenge,tranche_id:trancheId,device_id:deviceId,expires_at:expires.toISOString(),algorithm:'Ed25519',mode:'SIMULATED_DEVICE_SIGNATURE',note:'Signature is cryptographically bound to tranche_id and expires_at. A web signature is not a native biometric assertion; native OS biometric integration remains a client-platform requirement.'};
 }
 async authorizeAndSimulate(userId:string,trancheId:string,input:{challengeId:string;deviceId:string;signature:string}){
  if(!input?.challengeId||!input?.deviceId||!input?.signature) throw new BadRequestException('Challenge, device and signature are required.');
  const client=await this.pool.connect(); try { await client.query('BEGIN');
   const q=await client.query(`SELECT c.id challenge_id,c.challenge,c.expires_at challenge_expiry,d.public_key_pem,t.id tranche_id,t.amount,t.status tranche_status,t.authorization_expires_at,p.id plan_id,p.symbol,p.status plan_status,p.signal_id,s.entry_price::text signal_entry_price,s.expires_at signal_expires_at,s.invalidated_at signal_invalidated_at,m.price::text price,m.received_at,m.provider_latency_ms FROM tranche_authorization_challenges c JOIN user_devices d ON d.id=c.device_id AND d.user_id=c.user_id JOIN investment_tranches t ON t.id=c.tranche_id JOIN investment_plans p ON p.id=t.plan_id LEFT JOIN advisory_signals s ON s.id=p.signal_id AND s.user_id=p.user_id JOIN LATERAL (SELECT price,received_at,provider_latency_ms FROM market_ticks WHERE symbol=p.symbol ORDER BY received_at DESC,id DESC LIMIT 1) m ON TRUE WHERE c.id=$1 AND c.user_id=$2 AND c.tranche_id=$3 AND c.device_id=$4 AND c.consumed_at IS NULL AND c.expires_at>=NOW() AND d.revoked_at IS NULL FOR UPDATE OF c,t,p,d`,[input.challengeId,userId,trancheId,input.deviceId]);
   if(!q.rowCount) throw new UnauthorizedException('Authorization challenge invalid, expired, used or device revoked.'); const r=q.rows[0];
   if(r.tranche_status!=='AUTHORIZATION_OPEN'||r.plan_status!=='ACTIVE'||new Date(r.authorization_expires_at).getTime()<Date.now()) throw new ConflictException('Authorization window closed or plan is not active.');
   if(!r.signal_id || !r.signal_entry_price || r.signal_invalidated_at || !r.signal_expires_at || new Date(r.signal_expires_at).getTime()<Date.now()) throw new ConflictException('No valid, unexpired advisory signal is attached to this plan. Execution is blocked.');
   const age=Date.now()-new Date(r.received_at).getTime();
   const upwardShift=(Number(r.price)-Number(r.signal_entry_price))/Number(r.signal_entry_price)*100;
   const policy=evaluateTrancheAuthorization({authorizationExpiresAt:new Date(r.authorization_expires_at),completedAt:new Date(),signalExpiresAt:new Date(r.signal_expires_at),signalInvalidated:Boolean(r.signal_invalidated_at),marketAgeMs:age,tickerLatencyMs:Number(r.provider_latency_ms),upwardPriceShiftPct:upwardShift});
   if(!policy.allowed) { if(policy.reasons.includes('PRICE_SHIFT_ALERT')) { await client.query(`UPDATE advisory_signals SET invalidated_at=NOW(),invalidation_reason='UPWARD_PRICE_SHIFT_GT_2_PERCENT' WHERE id=$1 AND invalidated_at IS NULL`,[r.signal_id]); await client.query('COMMIT'); } throw new ConflictException({message:'Tranche authorization rejected by server-side safety policy.',reasons:policy.reasons}); }
   const sig=Buffer.from(input.signature,'base64url'); const key=createPublicKey(r.public_key_pem); if(!verifySignature(null,Buffer.from(r.challenge,'utf8'),key,sig)) throw new UnauthorizedException('Device signature invalid.');
   const consumed=await client.query(`UPDATE tranche_authorization_challenges SET consumed_at=NOW() WHERE id=$1 AND consumed_at IS NULL AND expires_at>=NOW() RETURNING id`,[input.challengeId]); if(!consumed.rowCount) throw new UnauthorizedException('Challenge already consumed.');
   // Simulated adapter only. No exchange SDK, withdrawals, transfers or live order endpoint exists.
   const amount=Number(r.amount); const fill=await this.exchange.submitOrder({symbol:r.symbol,quoteAmount:amount,referencePrice:Number(r.price),idempotencyKey:trancheId}); const quantity=fill.quantity,price=fill.price;
   await client.query(`INSERT INTO simulated_trades(user_id,plan_id,tranche_id,symbol,quantity,price,quote_amount,execution_mode,status) VALUES($1,$2,$3,$4,$5,$6,$7,'SIMULATED','CONFIRMED')`,[userId,r.plan_id,trancheId,r.symbol,quantity,price,amount]);
   await client.query(`UPDATE investment_tranches SET status='EXECUTED',authorized_at=NOW(),executed_at=NOW() WHERE id=$1`,[trancheId]);
   await client.query(`INSERT INTO notification_outbox(user_id,event_type,channel,payload) VALUES($1,'SIMULATED_TRADE_CONFIRMED','IN_APP',$2::jsonb)`,[userId,JSON.stringify({tranche_id:trancheId,symbol:r.symbol,quote_amount:amount,price,quantity,execution_mode:'SIMULATED'})]);
   await client.query(`UPDATE investment_plans SET status='COMPLETED',updated_at=NOW() WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM investment_tranches WHERE plan_id=$1 AND status IN ('SCHEDULED','AUTHORIZATION_OPEN','PAUSED'))`,[r.plan_id]);
   await client.query('COMMIT'); return {status:'SIMULATED_EXECUTION_CONFIRMED',tranche_id:trancheId,symbol:r.symbol,quantity,price,quote_amount:amount,execution_mode:'SIMULATED',live_exchange_order:false};
  } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
 }
 async trades(userId:string,from?:string,to?:string){const r=await this.pool.query(`SELECT t.id,t.plan_id,t.tranche_id,t.symbol,a.display_name AS asset_name,t.quantity::text,t.price::text,t.quote_amount::text,t.executed_at,t.execution_mode,t.status FROM simulated_trades t JOIN market_assets a ON a.symbol=t.symbol WHERE t.user_id=$1 AND ($2::date IS NULL OR t.executed_at >= $2::date) AND ($3::date IS NULL OR t.executed_at < ($3::date+INTERVAL '1 day')) ORDER BY t.executed_at DESC`,[userId,from||null,to||null]); return r.rows;}
}
