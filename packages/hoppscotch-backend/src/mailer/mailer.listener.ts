import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Events } from 'src/types/EventEmitter';
import {
  AdminUserInvitationMailDescription,
  MailDescription,
  UserMagicLinkMailDescription,
} from './MailDescriptions';
import { MailerService } from './mailer.service';

@Injectable()
export class MailerEventListener {
  constructor(private mailerService: MailerService) {}

  @OnEvent(Events.MAILER_SEND_EMAIL, { async: true })
  async handleSendEmailEvent(data: {
    to: string;
    mailDesc: MailDescription | UserMagicLinkMailDescription;
  }) {
    await this.mailerService.sendEmail(data.to, data.mailDesc);
  }

  @OnEvent(Events.MAILER_SEND_USER_INVITATION_EMAIL, { async: true })
  async handleSendUserInvitationEmailEvent(data: {
    to: string;
    mailDesc: AdminUserInvitationMailDescription;
  }) {
    await this.mailerService.sendUserInvitationEmail(data.to, data.mailDesc);
  }
}
