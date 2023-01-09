import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MailerService } from 'src/mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from 'src/user/user.model';
import { UserService } from 'src/user/user.service';
import { verifyMagicDto } from './dto/verify-magic.dto';
import { DateTime } from 'luxon';
import * as argon2 from 'argon2';
import bcrypt from 'bcrypt';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { PasswordlessToken } from 'src/types/Passwordless';
import { EmailCodec } from 'src/types/Email';
import { INVALID_EMAIL } from 'src/errors';
import { pipe } from 'fp-ts/lib/function';
import { validateEmail } from 'src/utils';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private prismaService: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  // generate Id and token for email magiclink
  private async generatePasswordlessTokens(user: User) {
    const salt = await bcrypt.genSalt(10);
    const expiresOn = DateTime.now().plus({ hours: 3 }).toISO().toString();

    const idToken: PasswordlessToken =
      await this.prismaService.passwordlessVerification.create({
        data: {
          expiresOn: expiresOn,
          deviceIdentifier: salt,
          userUid: user.id,
        },
      });

    return idToken;
  }

  async signIn(email: string) {
    if (!validateEmail(email)) return E.left(INVALID_EMAIL);

    let user: User;
    const queriedUser = await this.usersService.findUserByEmail(email);

    if (O.isNone(queriedUser)) {
      user = await this.usersService.createUser(email);
    } else {
      user = queriedUser.value;
    }

    const generatedTokens = await this.generatePasswordlessTokens(user);

    this.mailerService.sendMail(email, {
      template: 'code-your-own',
      variables: {
        inviteeEmail: email,
        magicLink: `${process.env.APP_DOMAIN}/magic-link?token=${generatedTokens.token}`,
      },
    });

    return { deviceIdentifier: generatedTokens.deviceIdentifier };
  }
}
