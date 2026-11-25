import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { PlansService } from './plans.service';
@Controller('plans') @UseGuards(AuthGuard)
export class PlansController { constructor(private readonly plans:PlansService){}
 @Post() create(@Req() r:AuthenticatedRequest,@Body() b:{symbol:string;quoteAsset:string;availableBalance:number;allocationPct:number;signalId?:string}){return this.plans.create(r.user.id,b);}
 @Get() list(@Req() r:AuthenticatedRequest){return this.plans.list(r.user.id);}
 @Get(':id') get(@Req() r:AuthenticatedRequest,@Param('id') id:string){return this.plans.get(r.user.id,id);}
 @Post(':id/pause') pause(@Req() r:AuthenticatedRequest,@Param('id') id:string){return this.plans.changeState(r.user.id,id,'pause');}
 @Post(':id/resume') resume(@Req() r:AuthenticatedRequest,@Param('id') id:string){return this.plans.changeState(r.user.id,id,'resume');}
 @Post(':id/adjust') adjust(@Req() r:AuthenticatedRequest,@Param('id') id:string,@Body() b:{symbol:string;quoteAsset:string;availableBalance:number;allocationPct:number;signalId?:string}){return this.plans.adjust(r.user.id,id,b);}
 @Post(':id/cancel') cancel(@Req() r:AuthenticatedRequest,@Param('id') id:string){return this.plans.changeState(r.user.id,id,'cancel');}
}
