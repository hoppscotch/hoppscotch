import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const { req, headers } = ctx.getContext();
    const request = headers ? headers : req;
    const user = request.user;
    if (user.isAdmin) return true;
    else return false;
  }
}
