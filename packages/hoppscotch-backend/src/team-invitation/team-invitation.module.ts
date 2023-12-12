import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PubSubModule } from 'src/pubsub/pubsub.module';
import { TeamModule } from 'src/team/team.module';
import { UserModule } from 'src/user/user.module';
import { TeamInvitationResolver } from './team-invitation.resolver';
import { TeamInvitationService } from './team-invitation.service';
import { TeamInviteTeamOwnerGuard } from './team-invite-team-owner.guard';
import { TeamInviteViewerGuard } from './team-invite-viewer.guard';
import { TeamInviteeGuard } from './team-invitee.guard';
import { TeamTeamInviteExtResolver } from './team-teaminvite-ext.resolver';

@Module({
  imports: [PrismaModule, TeamModule, PubSubModule, UserModule],
  providers: [
    TeamInvitationService,
    TeamInvitationResolver,
    TeamTeamInviteExtResolver,
    TeamInviteeGuard,
    TeamInviteViewerGuard,
    TeamInviteTeamOwnerGuard,
  ],
  exports: [TeamInvitationService],
})
export class TeamInvitationModule {}
