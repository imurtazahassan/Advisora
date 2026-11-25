import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { calculatePlanAllocation, trancheSchedule } from './plans.policy';
import { PG_POOL } from '../database/database.module';

@Injectable()
export class PlansService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(userId: string, input: { symbol: string; quoteAsset: string; availableBalance: number; allocationPct: number; signalId?: string }) {
    if (!input) throw new BadRequestException('Plan details are required.');
    const symbol = input?.symbol?.trim().toUpperCase();
    const quoteAsset = input?.quoteAsset?.trim().toUpperCase();
    const balance = Number(input?.availableBalance); const pct = Number(input?.allocationPct);
    if (!symbol || !quoteAsset || !Number.isFinite(balance) || balance <= 0 || !Number.isFinite(pct) || pct <= 0 || pct > 5) throw new BadRequestException('Provide a symbol, quote asset, positive simulated available balance and allocation from greater than 0% through 5%.');
    const asset = await this.pool.query('SELECT symbol, quote_asset FROM market_assets WHERE symbol=$1 AND enabled=TRUE', [symbol]);
    if (input.signalId) { const signal = await this.pool.query(`SELECT id FROM advisory_signals WHERE id=$1 AND user_id=$2 AND symbol=$3 AND invalidated_at IS NULL AND expires_at>NOW()`, [input.signalId,userId,symbol]); if (!signal.rowCount) throw new BadRequestException('Signal is not active, valid, or associated with this user and asset.'); }
    if (!asset.rowCount || asset.rows[0].quote_asset !== quoteAsset) throw new BadRequestException('Asset is not enabled or quote asset does not match.');
    // Current exchange integration is explicitly simulated. USDT uses 2 quote decimals in this demo adapter.
    let allocation: ReturnType<typeof calculatePlanAllocation>;
    try { allocation = calculatePlanAllocation(balance, pct, 2); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid allocation.'); }
    const tranche = allocation.trancheAmount;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const plan = await client.query(`INSERT INTO investment_plans(user_id,symbol,signal_id,quote_asset,available_balance,allocation_pct,total_allocation,tranche_amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [userId,symbol,input.signalId||null,quoteAsset,balance,pct,tranche*3,tranche]);
      const p = plan.rows[0];
      const schedule = trancheSchedule(new Date(p.approved_at));
      for (let i=0;i<3;i++) await client.query(`INSERT INTO investment_tranches(plan_id,tranche_number,amount,scheduled_at) VALUES($1,$2,$3,$4)`, [p.id,i+1,tranche,schedule[i]]);
      await client.query(`INSERT INTO notification_outbox(user_id,event_type,channel,payload) VALUES($1,'PLAN_CREATED','IN_APP',$2::jsonb)`, [userId,JSON.stringify({plan_id:p.id,message:'Plan created. No trade was executed; each tranche requires separate authorization.'})]);
      await client.query('COMMIT');
      return { ...p, total_allocation: String(allocation.totalAllocation), tranche_amount: String(tranche), execution_mode:'SIMULATED_ONLY', trade_executed:false, tranches:3 };
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async list(userId: string) { const r=await this.pool.query(`SELECT p.*, (SELECT json_agg(json_build_object('id',t.id,'tranche_number',t.tranche_number,'amount',t.amount,'scheduled_at',t.scheduled_at,'status',t.status) ORDER BY t.tranche_number) FROM investment_tranches t WHERE t.plan_id=p.id) AS tranches FROM investment_plans p WHERE p.user_id=$1 ORDER BY p.created_at DESC`,[userId]); return r.rows; }
  async get(userId: string, id: string) { const r=await this.pool.query(`SELECT p.*, (SELECT json_agg(to_jsonb(t) ORDER BY t.tranche_number) FROM investment_tranches t WHERE t.plan_id=p.id) tranches FROM investment_plans p WHERE p.id=$1 AND p.user_id=$2`,[id,userId]); if(!r.rowCount) throw new NotFoundException('Plan not found'); return r.rows[0]; }
  async adjust(userId:string,id:string,input:{symbol:string;quoteAsset:string;availableBalance:number;allocationPct:number;signalId?:string}) {
    if (!input) throw new BadRequestException('Replacement plan details are required.');
    const symbol=input.symbol?.trim().toUpperCase();
    const quoteAsset=input.quoteAsset?.trim().toUpperCase();
    const balance=Number(input.availableBalance);
    const pct=Number(input.allocationPct);
    if (!symbol || !quoteAsset || !Number.isFinite(balance) || balance<=0 || !Number.isFinite(pct) || pct<=0 || pct>5) {
      throw new BadRequestException('Provide a symbol, quote asset, positive simulated available balance and allocation from greater than 0% through 5%.');
    }
    let allocation:ReturnType<typeof calculatePlanAllocation>;
    try { allocation=calculatePlanAllocation(balance,pct,2); }
    catch(error) { throw new BadRequestException(error instanceof Error?error.message:'Invalid replacement allocation.'); }

    // Replacement and cancellation are one transaction: a failed replacement
    // must never leave the user's previous plan cancelled without a new plan.
    const client=await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existing=await client.query(`SELECT id,status FROM investment_plans WHERE id=$1 AND user_id=$2 FOR UPDATE`,[id,userId]);
      if(!existing.rowCount) throw new NotFoundException('Plan not found');
      if(!['ACTIVE','PAUSED','CANCELLED'].includes(existing.rows[0].status)) throw new ConflictException('This plan cannot be restarted or adjusted.');
      const asset=await client.query(`SELECT symbol,quote_asset FROM market_assets WHERE symbol=$1 AND enabled=TRUE`,[symbol]);
      if(!asset.rowCount||asset.rows[0].quote_asset!==quoteAsset) throw new BadRequestException('Replacement asset or quote asset is invalid.');
      if(input.signalId) {
        const signal=await client.query(`SELECT id FROM advisory_signals WHERE id=$1 AND user_id=$2 AND symbol=$3 AND invalidated_at IS NULL AND expires_at>NOW()`,[input.signalId,userId,symbol]);
        if(!signal.rowCount) throw new BadRequestException('Replacement signal is not valid.');
      }
      if(existing.rows[0].status!=='CANCELLED') {
        await client.query(`UPDATE investment_plans SET status='CANCELLED',updated_at=NOW() WHERE id=$1`,[id]);
        await client.query(`UPDATE investment_tranches SET status='CANCELLED',authorization_expires_at=NULL,authorization_challenge=NULL WHERE plan_id=$1 AND status NOT IN ('EXECUTED','SKIPPED','CANCELLED')`,[id]);
      }
      const inserted=await client.query(`INSERT INTO investment_plans(user_id,symbol,signal_id,quote_asset,available_balance,allocation_pct,total_allocation,tranche_amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[userId,symbol,input.signalId||null,quoteAsset,balance,pct,allocation.totalAllocation,allocation.trancheAmount]);
      const plan=inserted.rows[0];
      const schedule=trancheSchedule(new Date(plan.approved_at));
      for(let i=0;i<3;i++) await client.query(`INSERT INTO investment_tranches(plan_id,tranche_number,amount,scheduled_at) VALUES($1,$2,$3,$4)`,[plan.id,i+1,allocation.trancheAmount,schedule[i]]);
      await client.query(`INSERT INTO notification_outbox(user_id,event_type,channel,payload) VALUES($1,'PLAN_REPLACED','IN_APP',$2::jsonb)`,[userId,JSON.stringify({replaced_plan_id:id,new_plan_id:plan.id,message:'Replacement plan created. No trade was executed.'})]);
      await client.query('COMMIT');
      return {replaced_plan_id:id,new_plan:{...plan,total_allocation:String(allocation.totalAllocation),tranche_amount:String(allocation.trancheAmount),execution_mode:'SIMULATED_ONLY',trade_executed:false,tranches:3},executed_tranches_preserved:true};
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async changeState(userId:string,id:string,action:'pause'|'resume'|'cancel') {
    const client=await this.pool.connect(); try { await client.query('BEGIN');
      const q=await client.query('SELECT * FROM investment_plans WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,userId]); if(!q.rowCount) throw new NotFoundException('Plan not found'); const plan=q.rows[0];
      if(action==='pause') {
        if(plan.status!=='ACTIVE') throw new ConflictException('Only active plans can be paused.');
        await client.query(`UPDATE investment_plans SET status='PAUSED',updated_at=NOW() WHERE id=$1`,[id]);
        // Revoke any open prompt. The original scheduled_at is retained so resume
        // can distinguish a still-future tranche from one missed during the pause.
        await client.query(`UPDATE investment_tranches SET status='PAUSED',authorization_expires_at=NULL,authorization_challenge=NULL WHERE plan_id=$1 AND status IN ('SCHEDULED','AUTHORIZATION_OPEN')`,[id]);
      }
      if(action==='resume') {
        if(plan.status!=='PAUSED') throw new ConflictException('Only paused plans can resume.');
        await client.query(`UPDATE investment_plans SET status='ACTIVE',updated_at=NOW() WHERE id=$1`,[id]);
        // Only future scheduled tranches resume. Any tranche whose original
        // scheduled time passed while paused is permanently skipped; no prompt
        // is opened immediately on resume and no missed interval is backfilled.
        await client.query(`
          WITH skipped AS (
            UPDATE investment_tranches SET status='SKIPPED'
            WHERE plan_id=$1 AND status='PAUSED' AND scheduled_at <= NOW()
            RETURNING id,tranche_number
          )
          INSERT INTO notification_outbox(user_id,event_type,channel,payload)
          SELECT $2,'TRANCHE_SKIPPED_MISSED','IN_APP',
            jsonb_build_object('plan_id',$1::text,'tranche_id',id,'tranche_number',tranche_number,'reason','MISSED_WHILE_PLAN_PAUSED')
          FROM skipped
        `,[id,userId]);
        await client.query(`
          WITH future AS (
            SELECT id,ROW_NUMBER() OVER (ORDER BY tranche_number) AS sequence_number
            FROM investment_tranches
            WHERE plan_id=$1 AND status='PAUSED' AND scheduled_at > NOW()
          )
          UPDATE investment_tranches t
          SET status='SCHEDULED',scheduled_at=NOW()+(future.sequence_number * INTERVAL '24 hours')
          FROM future WHERE t.id=future.id
        `,[id]);
      }
      if(action==='cancel') { if(plan.status==='CANCELLED'||plan.status==='COMPLETED') throw new ConflictException('Plan is already closed.'); await client.query(`UPDATE investment_plans SET status='CANCELLED',updated_at=NOW() WHERE id=$1`,[id]); await client.query(`UPDATE investment_tranches SET status='CANCELLED',authorization_expires_at=NULL,authorization_challenge=NULL WHERE plan_id=$1 AND status NOT IN ('EXECUTED','SKIPPED','CANCELLED')`,[id]); }
      await client.query(`INSERT INTO notification_outbox(user_id,event_type,channel,payload) VALUES($1,$2,'IN_APP',$3::jsonb)`,[userId,`PLAN_${action.toUpperCase()}`,JSON.stringify({plan_id:id})]); await client.query('COMMIT'); return this.get(userId,id);
    } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
  }
}
