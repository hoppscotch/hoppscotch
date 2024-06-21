import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthUser } from 'src/types/AuthUser';
import { UserService } from 'src/user/user.service';

@Injectable()
export class UserLastActiveOnInterceptor implements NestInterceptor {
  constructor(private userService: UserService) {}

  user: AuthUser; // 'user', who executed the request

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      return this.restHandler(context, next);
    } else if (context.getType<GqlContextType>() === 'graphql') {
      return this.graphqlHandler(context, next);
    }
  }

  restHandler(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    this.user = request.user;

    return next.handle().pipe(
      tap(() => {
        if (this.user && typeof this.user === 'object') {
          this.userService.updateUserLastActiveOn(this.user.uid);
        }
      }),
      catchError((error) => {
        if (this.user && typeof this.user === 'object') {
          this.userService.updateUserLastActiveOn(this.user.uid);
        }
        return throwError(() => error);
      }),
    );
  }

  graphqlHandler(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const contextObject = GqlExecutionContext.create(context).getContext();
    this.user = contextObject.req.user;

    return next.handle().pipe(
      tap(() => {
        if (this.user && typeof this.user === 'object') {
          this.userService.updateUserLastActiveOn(this.user.uid);
        }
      }),
      catchError((error) => {
        if (this.user && typeof this.user === 'object') {
          this.userService.updateUserLastActiveOn(this.user.uid);
        }
        return throwError(() => error);
      }),
    );
  }
}
