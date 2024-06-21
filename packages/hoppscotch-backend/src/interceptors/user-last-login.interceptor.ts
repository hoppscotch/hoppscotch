import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthUser } from 'src/types/AuthUser';
import { UserService } from 'src/user/user.service';

@Injectable()
export class UserLastLoginInterceptor implements NestInterceptor {
  constructor(private userService: UserService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const user: AuthUser = context.switchToHttp().getRequest().user;

    return next.handle().pipe(
      tap(() => {
        this.userService.updateUserLastLoggedOn(user.uid);
      }),
    );
  }
}
