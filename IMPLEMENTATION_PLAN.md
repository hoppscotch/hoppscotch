# Implementation Plan: Nested Environment Variables

## Problem Statement
User reported that Postman supports nested environment variables like `{{ {{country-code}}{{environment}} }}` but Hoppscotch doesn't. This limitation forces users to create 450+ environments instead of 15 dynamic ones, significantly reducing productivity.

## Solution Overview
Enhanced Hoppscotch's environment variable system to support Postman-style nested templating while maintaining backward compatibility.

## Key Changes Made

### 1. Enhanced Parser (`/packages/hoppscotch-data/src/environment/index.ts`)
```typescript
// NEW: Added support for both syntaxes
const REGEX_POSTMAN_VAR = /\{\{([^}]*)\}\}/g

// ENHANCED: parseTemplateStringE now supports:
// - Postman syntax: {{variable}}
// - Nested variables: {{{{country}}{{env}}}}
// - Mixed syntax: <<{{country}}>>
// - Increased depth limit: 15 levels (was 10)
```

### 2. JavaScript Sandbox Updates
**Files Updated:**
- `/packages/hoppscotch-js-sandbox/src/bootstrap-code/post-request.js`
- `/packages/hoppscotch-js-sandbox/src/bootstrap-code/pre-request.js`

**Enhancement:**
```javascript
// ENHANCED: pm.variables.replaceIn() now supports nested resolution
replaceIn: (template) => {
  // Resolves nested patterns like {{{{key1}}{{key2}}}}
  // Maintains Postman compatibility
}
```

### 3. Documentation
- Created comprehensive documentation: `NESTED_ENVIRONMENT_VARIABLES.md`
- Added test cases: `test-nested-vars.ts`
- Provided migration guide and examples

## Technical Implementation Details

### Parsing Algorithm
1. **Detection**: Check if template contains nested patterns or Postman syntax
2. **Key Resolution**: Resolve variables within keys first (`{{country}}{{env}}` → `USPROD`)  
3. **Value Lookup**: Find variable with resolved key name
4. **Depth Protection**: Limit recursion to prevent infinite loops
5. **Fallback**: Use original parsing for simple cases

### Syntax Support
| Pattern | Support | Example |
|---------|---------|---------|
| `<<variable>>` | ✅ Existing | `<<api-url>>` |
| `{{variable}}` | ✅ NEW | `{{api-url}}` |
| `{{{{key1}}{{key2}}}}` | ✅ NEW | `{{{{country}}{{env}}}}` |
| Mixed | ✅ NEW | `<<{{country}}>>` |

### Backward Compatibility
- ✅ All existing `<<variable>>` syntax works unchanged
- ✅ No breaking changes to current environments
- ✅ Gradual adoption - users can opt-in to new features

## Testing Strategy

### Test Cases Covered
1. **Basic Nested**: `{{{{country-code}}-{{environment}}-{{service}}}}`
2. **URL Construction**: `{{{{region}}-{{env}}-api}}/users/profile`
3. **Dynamic Switching**: Change base vars to switch entire configuration
4. **Mixed Syntax**: `<<{{country}}>>/api/{{version}}`
5. **Complex Nesting**: Multi-level variable resolution
6. **Error Handling**: Circular references, depth limits, missing variables

### Performance Testing
- ✅ Tested with 15+ environment configurations
- ✅ Verified depth limiting prevents infinite loops
- ✅ Confirmed backward compatibility performance

## Benefits Delivered

### For Users
- **Reduced Complexity**: 1 environment instead of 450+
- **Dynamic Configuration**: Change base variables to switch entire setup
- **Postman Compatibility**: Familiar syntax and behavior
- **Flexible Architecture**: Supports complex service discovery patterns

### For Development Team
- **Backward Compatible**: No migration needed for existing users
- **Extensible Design**: Foundation for future enhancements
- **Well Documented**: Clear examples and migration guide
- **Test Coverage**: Comprehensive test cases for reliability

## Migration Path for Users

### Immediate Benefits (No Changes Required)
- Existing environments work as-is
- Can start using `{{variable}}` syntax immediately
- Gradual adoption of nested features

### Optimization Opportunity
```javascript
// BEFORE: 15 separate environments
Environment_US_PROD: { api-url: "https://us.prod.com" }
Environment_US_DEV:  { api-url: "https://us.dev.com" }
Environment_EU_PROD: { api-url: "https://eu.prod.com" }
// ... 12 more environments

// AFTER: 1 dynamic environment  
Dynamic_Environment: {
  country: "US",
  environment: "PROD", 
  US-PROD-api: "https://us.prod.com",
  US-DEV-api: "https://us.dev.com", 
  EU-PROD-api: "https://eu.prod.com",
  // Usage: {{{{country}}-{{environment}}-api}}
}
```

## Future Enhancements Roadmap

### Phase 2: Global Sharing (Nice-to-Have)
- Shared environment variables across users/teams
- Matches Postman's global variable sharing
- Team-level variable management

### Phase 3: Environment Trees (Nice-to-Have) 
- Hierarchical environment organization
- Visual environment designer
- Advanced import/export capabilities

### Phase 4: Enhanced UX
- Auto-complete for nested variable construction
- Visual nested variable builder
- Enhanced Postman import/export

## Conclusion
This implementation delivers the **urgent** requirement for nested environment variables while laying groundwork for **nice-to-have** features like environment trees and global sharing. Users can immediately reduce their 450+ environments to 15 dynamic ones, dramatically improving productivity and matching Postman's capabilities.