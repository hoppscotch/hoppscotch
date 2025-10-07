import { Injectable } from '@nestjs/common';
import { InfraConfigService } from '../infra-config/infra-config.service';
import { UserService } from '../user/user.service';
import { AuthUser } from '../types/AuthUser';
import { UserRegistrationSettings, UserStatus, RegistrationMode } from '../types/UserManagement';
import * as E from 'fp-ts/Either';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly infraConfigService: InfraConfigService,
    private readonly userService: UserService,
  ) {}

  /**
   * Get current user management settings
   */
  async getUserRegistrationSettings(): Promise<UserRegistrationSettings> {
    const configMap = await this.infraConfigService.getInfraConfigsMap();
    
    return {
      allowUserRegistration: configMap['ALLOW_USER_REGISTRATION'] !== 'false',
      registrationMode: (configMap['REGISTRATION_MODE'] as RegistrationMode) || RegistrationMode.OPEN,
      requireAdminApproval: configMap['REQUIRE_ADMIN_APPROVAL'] === 'true',
      allowUserAccountDeletion: configMap['ALLOW_USER_ACCOUNT_DELETION'] !== 'false',
      autoSelectLastInstance: configMap['AUTO_SELECT_LAST_INSTANCE'] === 'true',
    };
  }

  /**
   * Update user registration settings
   */
  async updateUserRegistrationSettings(
    settings: Partial<UserRegistrationSettings>
  ) {
    const configUpdates = [];

    if (settings.allowUserRegistration !== undefined) {
      configUpdates.push({
        name: 'ALLOW_USER_REGISTRATION',
        value: settings.allowUserRegistration.toString(),
      });
    }

    if (settings.registrationMode !== undefined) {
      configUpdates.push({
        name: 'REGISTRATION_MODE',
        value: settings.registrationMode,
      });
    }

    if (settings.requireAdminApproval !== undefined) {
      configUpdates.push({
        name: 'REQUIRE_ADMIN_APPROVAL',
        value: settings.requireAdminApproval.toString(),
      });
    }

    if (settings.allowUserAccountDeletion !== undefined) {
      configUpdates.push({
        name: 'ALLOW_USER_ACCOUNT_DELETION',
        value: settings.allowUserAccountDeletion.toString(),
      });
    }

    if (settings.autoSelectLastInstance !== undefined) {
      configUpdates.push({
        name: 'AUTO_SELECT_LAST_INSTANCE', 
        value: settings.autoSelectLastInstance.toString(),
      });
    }

    if (configUpdates.length > 0) {
      const result = await this.infraConfigService.updateMany(configUpdates, false);
      if (E.isLeft(result)) {
        return E.left({
          message: 'Failed to update user management settings',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }
    }

    return E.right(true);
  }

  /**
   * Check if admin can delete user accounts
   */
  async canAdminDeleteUser(adminUser: AuthUser): Promise<E.Either<any, boolean>> {
    if (!adminUser.isAdmin) {
      return E.left({
        message: 'Only administrators can delete user accounts',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const settings = await this.getUserRegistrationSettings();
    if (!settings.allowUserAccountDeletion) {
      return E.left({
        message: 'User account deletion is disabled by administrator',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    return E.right(true);
  }

  /**
   * Set user status (active, disabled, suspended, etc.)
   */
  async setUserStatus(userUid: string, status: UserStatus, adminUser: AuthUser) {
    if (!adminUser.isAdmin) {
      return E.left({
        message: 'Only administrators can modify user status',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    // Implementation would update user status in database
    // This is a placeholder for the actual implementation
    return E.right(true);
  }

  /**
   * Create user invitation
   */
  async createUserInvitation(email: string, adminUser: AuthUser) {
    if (!adminUser.isAdmin) {
      return E.left({
        message: 'Only administrators can create invitations',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const settings = await this.getUserRegistrationSettings();
    if (settings.registrationMode !== RegistrationMode.INVITATION_ONLY) {
      return E.left({
        message: 'Invitations are only available in invitation-only mode',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Implementation would create invitation record
    // This is a placeholder for the actual implementation
    return E.right(true);
  }
}