import { TeamMemberRole } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const RequiresTeamRole = (...roles: TeamMemberRole[]) =>
  SetMetadata('requiresTeamRole', roles);
