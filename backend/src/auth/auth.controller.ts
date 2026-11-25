import { Body, Controller, Get, Post, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') register(@Body() body: { email: string; password: string }) { return this.authService.register(body?.email, body?.password); }
  @Post('login') login(@Body() body: { email: string; password: string }) { return this.authService.login(body?.email, body?.password); }

  @UseGuards(AuthGuard)
  @Get('me') me(@Req() req: AuthenticatedRequest) { return { id: req.user.id, email: req.user.email }; }

  @UseGuards(AuthGuard)
  @Post('logout') logout(@Req() req: AuthenticatedRequest) { return this.authService.logout(req.user.sessionId, req.user.id); }

  @UseGuards(AuthGuard)
  @Post('devices/challenge') deviceChallenge(@Req() req: AuthenticatedRequest) { return this.authService.createDeviceChallenge(req.user.id); }

  @UseGuards(AuthGuard)
  @Post('devices') registerDevice(@Req() req: AuthenticatedRequest, @Body() body: { challengeId: string; deviceName: string; publicKey: string; signature: string }) { return this.authService.registerDevice(req.user.id, body); }

  @UseGuards(AuthGuard)
  @Post('devices/:id/authorization-challenge')
  deviceAuthorizationChallenge(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.authService.createDeviceAuthorizationChallenge(req.user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('devices/:id/verify')
  verifyDevice(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { challengeId: string; signature: string }) {
    return this.authService.verifyDeviceAuthorization(req.user.id, id, body?.challengeId, body?.signature);
  }

  @UseGuards(AuthGuard)
  @Get('devices') listDevices(@Req() req: AuthenticatedRequest) { return this.authService.listDevices(req.user.id); }

  @UseGuards(AuthGuard)
  @Delete('devices/:id') revokeDevice(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.authService.revokeDevice(req.user.id, id); }
}
