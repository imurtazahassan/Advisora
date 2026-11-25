import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'; import { AuthGuard } from '../auth/auth.guard'; import type { AuthenticatedRequest } from '../auth/auth.guard'; import { ExecutionService } from './execution.service';
@Controller() @UseGuards(AuthGuard) export class ExecutionController { constructor(private readonly service:ExecutionService){}
 @Post('scheduler/tick') tick(@Req() r:AuthenticatedRequest){return this.service.tick(r.user.id);}
 @Post('tranches/:id/authorization-challenge') challenge(@Req() r:AuthenticatedRequest,@Param('id') id:string,@Body() b:{deviceId:string}){return this.service.challenge(r.user.id,id,b?.deviceId);}
 @Post('tranches/:id/authorize') authorize(@Req() r:AuthenticatedRequest,@Param('id') id:string,@Body() b:{challengeId:string;deviceId:string;signature:string}){return this.service.authorizeAndSimulate(r.user.id,id,b);}
 @Get('trades') trades(@Req() r:AuthenticatedRequest,@Query('from') from?:string,@Query('to') to?:string){return this.service.trades(r.user.id,from,to);}
}
