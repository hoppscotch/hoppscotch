# Self-Hosting User Management Enhancement Implementation

## Overview

This implementation adds comprehensive user management controls for self-hosted Hoppscotch instances, addressing the requirements for registration control, admin-only account management, and instance auto-selection.

## Features Implemented

### 1. Registration Control System

**Configuration Options:**
- `ALLOW_USER_REGISTRATION`: Global toggle for user registration (boolean)
- `REGISTRATION_MODE`: Defines registration behavior
  - `OPEN`: Anyone can register (default)
  - `INVITATION_ONLY`: Only invited users can register
  - `DISABLED`: No new registrations allowed
- `REQUIRE_ADMIN_APPROVAL`: New users require admin approval (boolean)

**Implementation Files:**
- `src/types/InfraConfig.ts` - Added new configuration enums
- `src/types/UserManagement.ts` - User status and registration type definitions
- `src/auth/auth.service.ts` - Enhanced with registration checks
- `src/infra-config/infra-config.service.ts` - Configuration management

### 2. Admin-Only Account Management

**Features:**
- Only administrators can delete user accounts
- `ALLOW_USER_ACCOUNT_DELETION` configuration controls account deletion globally
- Enhanced user status management (Active, Pending, Disabled, Suspended)
- Invitation system for invitation-only mode

**Implementation Files:**
- `src/user/user.service.ts` - Enhanced with admin checks for deletion
- `src/user/user-management.service.ts` - Comprehensive user management service
- `src/user/user-management.resolver.ts` - GraphQL API endpoints
- `src/admin/admin.service.ts` - Existing admin controls enhanced

### 3. Instance Auto-Selection

**Configuration:**
- `AUTO_SELECT_LAST_INSTANCE`: Automatically select the last used instance (boolean)

**Frontend Integration Points:**
- Desktop client: Remember last instance URL
- Web client: Persist instance selection in localStorage
- Authentication flow: Auto-redirect to last used instance

## Database Schema Updates

### New Configuration Entries

```sql
-- Add to infra_config table
INSERT INTO infra_config (name, value) VALUES 
('ALLOW_USER_REGISTRATION', 'true'),
('REGISTRATION_MODE', 'OPEN'),
('REQUIRE_ADMIN_APPROVAL', 'false'),
('ALLOW_USER_ACCOUNT_DELETION', 'true'),
('AUTO_SELECT_LAST_INSTANCE', 'false');
```

### User Status Enhancement

```sql
-- Add user status column (future enhancement)
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
```

### Invitations Table (future enhancement)

```sql
CREATE TABLE user_invitations (
  id VARCHAR PRIMARY KEY,
  email VARCHAR NOT NULL,
  invited_by VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (invited_by) REFERENCES users(uid)
);
```

## API Endpoints

### GraphQL Mutations

```graphql
# Get user management settings (Admin only)
query GetUserRegistrationSettings {
  getUserRegistrationSettings {
    allowUserRegistration
    registrationMode
    requireAdminApproval
    allowUserAccountDeletion
    autoSelectLastInstance
  }
}

# Update user management settings (Admin only)
mutation UpdateUserRegistrationSettings($settings: UserRegistrationSettingsInput!) {
  updateUserRegistrationSettings(settings: $settings)
}

# Set user status (Admin only)
mutation SetUserStatus($userUid: String!, $status: UserStatus!) {
  setUserStatus(userUid: $userUid, status: $status)
}

# Create user invitation (Admin only)
mutation CreateUserInvitation($email: String!) {
  createUserInvitation(email: $email)
}
```

### REST API Enhancements

```typescript
// Enhanced authentication endpoint checks
POST /auth/magic-link
- Checks ALLOW_USER_REGISTRATION
- Validates REGISTRATION_MODE
- Handles invitation-only logic

// Enhanced user deletion
DELETE /admin/users/:uid
- Requires admin privileges
- Checks ALLOW_USER_ACCOUNT_DELETION
- Validates user status
```

## Configuration Management

### Environment Variables

```env
# User Registration Control
ALLOW_USER_REGISTRATION=true
REGISTRATION_MODE=OPEN
REQUIRE_ADMIN_APPROVAL=false

# Account Management
ALLOW_USER_ACCOUNT_DELETION=true

# Instance Selection
AUTO_SELECT_LAST_INSTANCE=false
```

### Admin Interface Controls

**Settings Panel:**
- Registration mode selector (Open/Invitation Only/Disabled)
- Toggle for admin approval requirement
- Toggle for user account deletion
- Toggle for auto instance selection

**User Management Panel:**
- User status controls
- Bulk action controls with admin restrictions
- Invitation management interface

## Security Considerations

### Registration Security

1. **Rate Limiting**: Magic link generation rate limited per IP
2. **Email Validation**: Robust email validation and sanitization  
3. **Invitation Security**: Cryptographically secure invitation tokens
4. **Approval Workflow**: Admin notifications for pending approvals

### Account Management Security

1. **Admin Verification**: Multi-level admin privilege checks
2. **Audit Logging**: All user management actions logged
3. **Confirmation Required**: Destructive actions require confirmation
4. **Last Admin Protection**: Prevent deletion of last admin user

### Instance Security

1. **Origin Validation**: Validate instance URLs against whitelist
2. **HTTPS Enforcement**: Require secure connections for instance URLs
3. **Token Isolation**: Instance-specific authentication tokens

## Frontend Integration

### Admin Dashboard Enhancements

```vue
<!-- User Management Settings -->
<template>
  <div class="user-management-settings">
    <h3>Registration Settings</h3>
    
    <FormToggle 
      v-model="settings.allowUserRegistration"
      label="Allow User Registration"
    />
    
    <FormSelect
      v-model="settings.registrationMode"
      :options="registrationModes"
      label="Registration Mode"
    />
    
    <FormToggle
      v-model="settings.requireAdminApproval"
      label="Require Admin Approval"
    />
    
    <FormToggle
      v-model="settings.allowUserAccountDeletion"
      label="Allow User Account Deletion"
    />
    
    <FormToggle
      v-model="settings.autoSelectLastInstance"
      label="Auto-Select Last Instance"
    />
  </div>
</template>
```

### User Management Interface

```vue
<!-- Enhanced User Actions -->
<template>
  <div class="user-actions">
    <DropdownMenu>
      <DropdownItem 
        @click="editUser"
        icon="edit"
      >
        Edit User
      </DropdownItem>
      
      <DropdownItem 
        v-if="canSetStatus"
        @click="setUserStatus"
        icon="user-check"
      >
        Set Status
      </DropdownItem>
      
      <DropdownItem 
        v-if="canDeleteUser && settings.allowUserAccountDeletion"
        @click="deleteUser"
        icon="trash"
        variant="danger"
      >
        Delete User
      </DropdownItem>
    </DropdownMenu>
  </div>
</template>
```

### Desktop Client Enhancements

```typescript
// Instance auto-selection service
export class InstanceSelectionService {
  private lastInstanceKey = 'hoppscotch-last-instance';

  async getLastInstance(): Promise<string | null> {
    return localStorage.getItem(this.lastInstanceKey);
  }

  async setLastInstance(instanceUrl: string): Promise<void> {
    localStorage.setItem(this.lastInstanceKey, instanceUrl);
  }

  async shouldAutoSelectInstance(): Promise<boolean> {
    const settings = await this.getInstanceSettings();
    return settings.autoSelectLastInstance;
  }
}
```

## Migration Guide

### For Existing Installations

1. **Database Migration**: Run database migration to add new config entries
2. **Configuration Update**: Update environment variables or admin settings
3. **User Communication**: Notify users of any registration changes
4. **Admin Training**: Brief administrators on new user management features

### Upgrade Process

```bash
# 1. Backup database
pg_dump hoppscotch > backup_$(date +%Y%m%d).sql

# 2. Apply migrations
npm run prisma:migrate

# 3. Update configuration
# Edit .env or use admin panel

# 4. Restart services
docker-compose restart
```

## Testing Strategy

### Unit Tests

```typescript
describe('UserManagementService', () => {
  it('should prevent registration when disabled', async () => {
    // Test registration blocking
  });

  it('should require invitation for invitation-only mode', async () => {
    // Test invitation validation
  });

  it('should prevent non-admin user deletion', async () => {
    // Test admin-only deletion
  });
});
```

### Integration Tests

```typescript
describe('Auth Registration Flow', () => {
  it('should handle registration mode changes', async () => {
    // Test end-to-end registration with different modes
  });

  it('should enforce admin-only account management', async () => {
    // Test admin privilege enforcement
  });
});
```

### E2E Tests

```typescript
describe('Admin User Management', () => {
  it('should allow admin to configure registration settings', async () => {
    // Test admin panel configuration
  });

  it('should prevent user account deletion when disabled', async () => {
    // Test deletion prevention
  });
});
```

## Monitoring and Observability

### Metrics

- Registration attempt rate
- Admin action frequency  
- User status distribution
- Instance selection patterns

### Logging

```typescript
// Enhanced logging for user management actions
logger.info('User registration blocked', {
  email: email,
  reason: 'REGISTRATION_DISABLED',
  instanceId: instanceId
});

logger.warn('Non-admin deletion attempt', {
  adminUid: adminUid,
  targetUid: targetUid,
  action: 'USER_DELETION'
});
```

### Alerts

- High registration failure rate
- Admin privilege escalation attempts
- Suspicious user management activity
- Configuration changes

## Future Enhancements

### Advanced Features

1. **Role-Based Access Control**: Granular permissions beyond admin/user
2. **User Groups**: Organize users into departments or teams
3. **Bulk User Operations**: Import/export user data
4. **Advanced Approval Workflows**: Multi-stage approval processes

### Integration Opportunities

1. **LDAP/SSO Integration**: Enterprise authentication integration
2. **Audit System**: Comprehensive audit trail for compliance
3. **Notification System**: Email/Slack notifications for admin actions
4. **API Rate Limiting**: Per-user and per-organization limits

## Conclusion

This implementation provides comprehensive user management controls for self-hosted Hoppscotch instances while maintaining security, usability, and administrative control. The modular design allows for easy extension and customization based on specific organizational needs.