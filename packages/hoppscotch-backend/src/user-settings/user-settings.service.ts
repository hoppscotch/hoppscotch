import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { User } from 'src/user/user.model';
import * as E from 'fp-ts/Either';
import { stringToJson } from 'src/utils';
import { UserSettings } from './user-settings.model';

@Injectable()
export class UserSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  async createUserSettings(user: User, properties: string) {
    const jsonProperties = stringToJson(properties);
    if (E.isLeft(jsonProperties)) return E.left(jsonProperties.left);

    const dbUserSettings = await this.prisma.userSettings.create({
      data: {
        properties: jsonProperties.right,
        userUid: user.uid,
      },
    });

    const userSettings: UserSettings = {
      id: dbUserSettings.id,
      userUid: dbUserSettings.userUid,
      properties,
      updatedOn: dbUserSettings.updatedOn,
    };

    return E.right(userSettings);
  }
}
