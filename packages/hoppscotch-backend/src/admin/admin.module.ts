import { Module } from '@nestjs/common';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PubSubModule } from '../pubsub/pubsub.module';
import { UserModule } from '../user/user.module';
import { MailerModule } from '../mailer/mailer.module';
import { TeamModule } from '../team/team.module';
import { TeamInvitationModule } from '../team-invitation/team-invitation.module';
import { TeamEnvironmentsModule } from '../team-environments/team-environments.module';
import { TeamCollectionModule } from '../team-collection/team-collection.module';
import { TeamRequestModule } from '../team-request/team-request.module';

@Module({
  imports: [
    PrismaModule,
    PubSubModule,
    UserModule,
    MailerModule,
    TeamModule,
    TeamInvitationModule,
    TeamEnvironmentsModule,
    TeamCollectionModule,
    TeamRequestModule,
  ],
  providers: [AdminResolver, AdminService],
  exports: [AdminService],
})
export class AdminModule {}
