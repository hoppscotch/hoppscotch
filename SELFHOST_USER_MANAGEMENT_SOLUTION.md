# Self-Hosting User Management Enhancement

## 🎯 Issue Description

This addresses critical user management needs for self-hosted Hoppscotch instances:

1. **No Registration Control** - Anyone can register and use the application
2. **Account Deletion Risk** - Users can delete their accounts, losing workspace/collection data
3. **Instance Selection Friction** - Users must manually switch instances every session
4. **No Admin Control** - Insufficient controls for managing user access

## 🔧 Proposed Solution

### 1. **Registration Control System**

Add new infrastructure configuration options to control user registration:

#### Backend Changes (`InfraConfig.ts`)
```typescript
export enum InfraConfigEnum {
  // ... existing configs
  
  // User Registration Control
  ALLOW_USER_REGISTRATION = 'ALLOW_USER_REGISTRATION',
  REGISTRATION_MODE = 'REGISTRATION_MODE', // 'OPEN', 'INVITATION_ONLY', 'DISABLED'
  REQUIRE_ADMIN_APPROVAL = 'REQUIRE_ADMIN_APPROVAL',
  ALLOW_USER_ACCOUNT_DELETION = 'ALLOW_USER_ACCOUNT_DELETION',
}
```

#### Registration Modes
- **OPEN** - Anyone can register (current behavior)
- **INVITATION_ONLY** - Only users with invite links can register  
- **DISABLED** - No new registrations allowed

### 2. **Admin-Only Account Management**

#### Enhanced User Service (`user.service.ts`)
```typescript
async deleteUserAccount(uid: string, requestingUserUid: string) {
  // Check if requesting user is admin
  const requestingUser = await this.getUserByUid(requestingUserUid);
  if (!requestingUser.isAdmin) {
    return E.left(INSUFFICIENT_PERMISSIONS);
  }
  
  // Check if user account deletion is allowed
  const allowDeletion = await this.infraConfigService.get(
    InfraConfigEnum.ALLOW_USER_ACCOUNT_DELETION
  );
  
  if (E.isLeft(allowDeletion) || allowDeletion.right.value !== 'true') {
    return E.left(USER_DELETION_DISABLED);
  }
  
  // Proceed with admin-initiated deletion
  return this.performUserDeletion(uid);
}
```

### 3. **Instance Auto-Selection**

#### Frontend Enhancement (`auth/web/index.ts`)
```typescript
// Store last used instance
const LAST_INSTANCE_KEY = 'hopp_last_instance_url';

export async function setLastUsedInstance(instanceUrl: string) {
  localStorage.setItem(LAST_INSTANCE_KEY, instanceUrl);
}

export function getLastUsedInstance(): string | null {
  return localStorage.getItem(LAST_INSTANCE_KEY);
}

export async function autoConnectToLastInstance() {
  const lastInstance = getLastUsedInstance();
  if (lastInstance && lastInstance !== getCurrentInstanceUrl()) {
    try {
      await switchToInstance(lastInstance);
    } catch (error) {
      console.warn('Failed to auto-connect to last instance:', error);
    }
  }
}
```

### 4. **Enhanced Authentication Middleware**

#### Registration Guard (`auth.service.ts`)
```typescript
async canUserRegister(): Promise<E.Either<string, boolean>> {
  const registrationMode = await this.infraConfigService.get(
    InfraConfigEnum.REGISTRATION_MODE
  );
  
  if (E.isLeft(registrationMode)) {
    return E.right(true); // Default to allow registration
  }
  
  const mode = registrationMode.right.value;
  
  switch (mode) {
    case 'DISABLED':
      return E.left(REGISTRATION_DISABLED);
    case 'INVITATION_ONLY':
      // Check for valid invitation token
      return this.validateInvitationToken();
    case 'OPEN':
    default:
      return E.right(true);
  }
}
```

## 📂 **Implementation Plan**

### Phase 1: Backend Infrastructure
1. **Add new InfraConfig enums** for registration control
2. **Enhance AuthService** with registration checks  
3. **Update UserService** with admin-only deletion
4. **Add middleware** to guard registration endpoints

### Phase 2: Admin Interface 
1. **Add settings panel** in sh-admin for registration control
2. **Update user management** with admin-only actions
3. **Add invitation system** for invitation-only mode
4. **Enhanced user status indicators** (pending approval, disabled, etc.)

### Phase 3: Frontend Client
1. **Instance auto-selection** on startup
2. **Registration disabled UI** when registration is off
3. **Admin-only account actions** in user settings
4. **Invitation link handling** for invitation-only mode

## 🎨 **User Experience Improvements**

### Admin Dashboard
- **Registration Controls**: Toggle registration modes
- **User Management**: Approve/deny pending users  
- **Account Controls**: Enable/disable accounts instead of deletion
- **Invitation System**: Generate and manage invite links

### User Experience
- **Seamless Instance Connection**: Auto-connect to last used instance
- **Clear Registration Status**: Show when registration is disabled
- **Secure Account Management**: Users cannot delete accounts when disabled

### Settings Flow
```
Admin Settings > User Management
├── Registration Mode: [Open/Invitation Only/Disabled]
├── Require Admin Approval: [Yes/No] 
├── Allow User Account Deletion: [Yes/No]
└── Instance Auto-Selection: [Enabled/Disabled]
```

## 🔒 **Security Considerations**

1. **Admin Verification**: All admin actions require authentication
2. **Invitation Tokens**: Secure, time-limited invitation links
3. **Audit Logging**: Track all user management actions
4. **Graceful Degradation**: Safe defaults when configs are missing

## 📋 **Database Schema Changes**

### User Table Enhancement
```sql
ALTER TABLE User ADD COLUMN status ENUM('ACTIVE', 'PENDING', 'DISABLED', 'SUSPENDED') DEFAULT 'ACTIVE';
ALTER TABLE User ADD COLUMN approvedBy VARCHAR(255) NULL;
ALTER TABLE User ADD COLUMN approvedAt DATETIME NULL;
```

### Invitation System  
```sql
CREATE TABLE UserInvitation (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  invitedBy VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME NULL,
  FOREIGN KEY (invitedBy) REFERENCES User(uid)
);
```

## 🧪 **Testing Strategy**

### Backend Testing
- Registration mode enforcement
- Admin permission validation  
- Invitation token generation/validation
- Account status management

### Frontend Testing  
- Instance auto-selection behavior
- Registration disabled UI states
- Admin-only action restrictions
- Invitation link handling

### Integration Testing
- End-to-end registration flows
- Admin user management workflows
- Instance switching functionality  
- Security boundary validation

## 📈 **Rollout Plan**

### 1. **Backward Compatibility**
- All new features are opt-in
- Existing instances continue working unchanged
- Gradual migration path for new settings

### 2. **Documentation**
- Self-hosting admin guide updates
- API documentation for new endpoints  
- User migration instructions
- Security best practices

### 3. **Deployment**
- Database migration scripts
- Environment variable updates
- Admin interface enhancements
- Client application updates

## ✅ **Success Criteria**

- ✅ **Registration Control**: Admins can disable public registration
- ✅ **Secure Account Management**: Only admins can delete/disable accounts
- ✅ **Instance Persistence**: Users auto-connect to last used instance  
- ✅ **Invitation System**: Invitation-only mode works seamlessly
- ✅ **Admin Dashboard**: Full user management capabilities
- ✅ **Backward Compatible**: Existing instances unaffected
- ✅ **Security**: All admin actions properly authorized

This solution provides comprehensive control over user access while maintaining the flexibility and usability that makes Hoppscotch valuable for teams.