import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './user.model';
import * as E from 'fp-ts/lib/Either';
import { USER_NOT_FOUND } from 'src/errors';
import { UpdateUserInput } from './dtos/update-user-input.dto';
import { PubSubService } from 'src/pubsub/pubsub.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  async updateUser(user: User, updateUserDto: UpdateUserInput) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { uid: user.uid },
        data: updateUserDto,
      });

      // Publish subscription for user updates
      await this.pubsub.publish(
        `user_settings/${user.uid}/updated`,
        updatedUser,
      );

      return E.right(updatedUser);
    } catch (e) {
      return E.left(USER_NOT_FOUND);
    }
  }
}
