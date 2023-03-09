import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MultiAuthGuard extends AuthGuard(['google1', 'google2']) {}
