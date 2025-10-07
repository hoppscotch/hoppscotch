import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlAdminGuard } from '../guards/gql-admin.guard';
import { GqlUser } from '../decorators/gql-user.decorator';
import { AuthUser } from '../types/AuthUser';
import { UserManagementService } from '../user/user-management.service';
import { UserRegistrationSettings, UserStatus } from '../types/UserManagement';
import { throwErr } from '../utils';
import * as E from 'fp-ts/Either';

@Resolver()
export class UserManagementResolver {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Query(() => UserRegistrationSettingsType, {
    description: 'Get current user registration settings',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async getUserRegistrationSettings(): Promise<UserRegistrationSettings> {
    return this.userManagementService.getUserRegistrationSettings();
  }

  @Mutation(() => Boolean, {
    description: 'Update user registration settings',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async updateUserRegistrationSettings(
    @Args('settings') settings: UserRegistrationSettingsInput,
    @GqlUser() user: AuthUser,
  ): Promise<boolean> {
    const result = await this.userManagementService.updateUserRegistrationSettings(settings);
    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Set user status (admin only)',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async setUserStatus(
    @Args('userUid') userUid: string,
    @Args('status') status: UserStatus,
    @GqlUser() admin: AuthUser,
  ): Promise<boolean> {
    const result = await this.userManagementService.setUserStatus(userUid, status, admin);
    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Create user invitation (admin only)',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async createUserInvitation(
    @Args('email') email: string,
    @GqlUser() admin: AuthUser,
  ): Promise<boolean> {
    const result = await this.userManagementService.createUserInvitation(email, admin);
    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }
}

// GraphQL Types (these would typically be in separate files)

class UserRegistrationSettingsType {
  allowUserRegistration: boolean;
  registrationMode: string;
  requireAdminApproval: boolean;
  allowUserAccountDeletion: boolean;
  autoSelectLastInstance: boolean;
}

class UserRegistrationSettingsInput {
  allowUserRegistration?: boolean;
  registrationMode?: string;
  requireAdminApproval?: boolean;
  allowUserAccountDeletion?: boolean;
  autoSelectLastInstance?: boolean;
}