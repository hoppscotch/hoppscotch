import { TeamAccessRole } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const RequiresTeamRole = (...roles: TeamAccessRole[]) =>
  SetMetadata('requiresTeamRole', roles);
