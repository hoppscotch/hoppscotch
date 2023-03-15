import { Injectable } from '@nestjs/common';
import {
  MailDescription,
  UserMagicLinkMailDescription,
} from './MailDescriptions';
import { throwErr } from 'src/utils';
import * as TE from 'fp-ts/TaskEither';
import { EMAIL_FAILED } from 'src/errors';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerService {
  constructor(private readonly nestMailerService: NestMailerService) {}

  /**
   * Takes an input mail description and spits out the Email subject required for it
   * @param mailDesc The mail description to get subject for
   * @returns The subject of the email
   */
  private resolveSubjectForMailDesc(
    mailDesc: MailDescription | UserMagicLinkMailDescription,
  ): string {
    switch (mailDesc.template) {
      case 'team-invitation':
        return `${mailDesc.variables.invitee} invited you to join ${mailDesc.variables.invite_team_name} in Hoppscotch`;

      case 'code-your-own':
        return 'Sign in to Hoppscotch';
    }
  }

  /**
   * Sends an email to the given email address given a mail description
   * @param to The email address to be sent to (NOTE: this is not validated)
   * @param mailDesc Definition of what email to be sent
   */
  sendMail(
    to: string,
    mailDesc: MailDescription | UserMagicLinkMailDescription,
  ) {
    return TE.tryCatch(
      async () => {
        await this.nestMailerService.sendMail({
          to,
          template: mailDesc.template,
          subject: this.resolveSubjectForMailDesc(mailDesc),
          context: mailDesc.variables,
        });
      },
      () => EMAIL_FAILED,
    );
  }

  /**
   *
   * @param to Receiver's email id
   * @param mailDesc Details of email to be sent for Magic-Link auth
   * @returns Response if email was send successfully or not
   */
  async sendAuthEmail(to: string, mailDesc: UserMagicLinkMailDescription) {
    try {
      await this.nestMailerService.sendMail({
        to,
        template: mailDesc.template,
        subject: this.resolveSubjectForMailDesc(mailDesc),
        context: mailDesc.variables,
      });
    } catch (error) {
      return throwErr(EMAIL_FAILED);
    }
  }
}
