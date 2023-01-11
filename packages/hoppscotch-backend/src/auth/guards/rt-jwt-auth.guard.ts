import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RTJwtAuthGuard extends AuthGuard('jwt-refresh') {}
