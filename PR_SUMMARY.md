# PR Title:
**fix(desktop): implement workspace-scoped tab persistence for proper workspace switching**

# PR Description:

## 🐛 Issue
When switching workspaces in the desktop client, opened tabs remained visible instead of being workspace-specific, causing confusion as tabs from one workspace appeared in another.

## 🔧 Solution
Implemented workspace-scoped tab persistence that maintains separate tab states for each workspace:

- **Personal workspace**: `REST_TABS_PERSONAL`, `GQL_TABS_PERSONAL`
- **Team workspaces**: `REST_TABS_TEAM_{teamID}`, `GQL_TABS_TEAM_{teamID}`

## ✨ Key Features
- ✅ **Workspace Isolation**: Each workspace maintains its own set of tabs
- ✅ **Auto Save/Restore**: Tabs are automatically saved when switching away and restored when returning
- ✅ **Backward Compatible**: Existing tabs are migrated to personal workspace
- ✅ **Cross-Platform**: Works on macOS, Windows, and web clients

## 🔄 User Experience
**Before**: All workspaces shared the same tabs ❌  
**After**: Each workspace has isolated, persistent tabs ✅

## 📂 Files Changed
- `services/tab/workspace-aware-tab.ts` - New utility for workspace keys
- `services/tab/rest.ts` - Added workspace awareness to REST tabs  
- `services/tab/graphql.ts` - Added workspace awareness to GraphQL tabs

## 🧪 Testing
- [x] Personal ↔ Team workspace switching
- [x] Multiple team workspace isolation  
- [x] Migration of existing tab state
- [x] Error handling and fallbacks

**Fixes**: Workspace tab switching issue on desktop clients  
**Type**: Bug Fix + Enhancement  
**Platform**: Desktop (macOS, Windows), Web  
**Breaking Changes**: None