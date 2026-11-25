import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AdvisoryService } from './advisory.service';

@Controller('advisories')
@UseGuards(AuthGuard)
export class AdvisoryController {
  constructor(private readonly advisories: AdvisoryService) {}

  @Post('generate')
  generate(@Req() req: AuthenticatedRequest, @Body() body: { symbol: string }) {
    return this.advisories.generate(req.user.id, body?.symbol);
  }

  @Get()
  history(@Req() req: AuthenticatedRequest) {
    return this.advisories.history(req.user.id);
  }

  @Get('accuracy')
  accuracy(@Req() req: AuthenticatedRequest) {
    return this.advisories.accuracy(req.user.id);
  }
}
