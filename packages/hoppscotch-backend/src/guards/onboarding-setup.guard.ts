import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OnboardingSetupGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const usersCount = await this.prisma.user.count();

    // Only allow onboarding when no users exist (fresh install)
    if (usersCount > 0) {
      return false;
    }

    return true;
  }
}
