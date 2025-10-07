# Workspace-Scoped Tab Management Fix

## Problem

When switching workspaces in the Hoppscotch macOS client, opened tabs do not switch along with the workspace. Instead, tabs remain visible across all workspaces, creating a confusing user experience where users expect tabs to be isolated per workspace.

## Root Cause

The issue occurs because:

1. Tab state is persisted globally using keys like `REST_TABS` and `GQL_TABS`
2. The tab services do not watch for workspace changes
3. All workspaces share the same tab state in persistence storage

## Solution

This PR implements workspace-scoped tab persistence by:

### 1. Creating a Workspace Key Generator

- Added `getWorkspaceScopedTabKey()` function to generate workspace-specific storage keys
- Personal workspace: `{baseKey}_PERSONAL`
- Team workspace: `{baseKey}_TEAM_{teamID}`

### 2. Updating Tab Services

Modified both `RESTTabService` and `GQLTabService` to:

- Watch for workspace changes using Vue's reactive system
- Save current tabs when switching away from a workspace
- Load workspace-specific tabs when switching to a workspace
- Maintain backward compatibility with existing tab data

### 3. Migration Strategy

For existing users:
- Personal workspace tabs are migrated from the global state
- Team workspaces start with fresh default tabs
- Legacy global state is preserved as fallback

### 4. Key Features

- **Automatic Tab Switching**: Tabs automatically save/restore when switching workspaces
- **Isolation**: Each workspace maintains its own tab state
- **Persistence**: Tab state persists across app sessions per workspace
- **Backward Compatibility**: Existing users won't lose their current tabs

## Implementation Details

### Files Modified

1. **`workspace-aware-tab.ts`**: Utility function for workspace-scoped keys
2. **`rest.ts`**: Added workspace awareness to REST tab service  
3. **`graphql.ts`**: Added workspace awareness to GraphQL tab service

### Key Changes

#### Workspace Watching
```typescript
watch(
  () => this.workspaceService!.currentWorkspace.value,
  async (newWorkspace: Workspace, oldWorkspace?: Workspace) => {
    // Save tabs for old workspace
    if (oldWorkspace && this.currentWorkspaceKey) {
      await this.saveTabsForWorkspace(oldWorkspace)
    }
    // Load tabs for new workspace  
    await this.loadTabsForWorkspace(newWorkspace)
  },
  { immediate: true }
)
```

#### Storage Strategy
- Uses existing localStorage with workspace-scoped keys
- Format: `hopp:{baseKey}_{workspaceType}_{workspaceId}`
- Graceful fallback to legacy global state

## Benefits

- **Improved UX**: Users see relevant tabs per workspace
- **Better Organization**: Workspace isolation improves productivity
- **Reduced Confusion**: No more irrelevant tabs visible in different workspaces
- **Seamless Migration**: Existing users experience smooth transition

## Testing Recommendations

1. Test workspace switching with open tabs
2. Verify tabs persist across app restarts per workspace
3. Confirm personal workspace migration from legacy data
4. Test team workspace tab isolation
5. Verify no data loss during workspace switches

This fix resolves the reported issue while maintaining all existing functionality and ensuring a smooth upgrade path for current users.