# Enhanced Environment Variables with Nested Support

## Overview

Hoppscotch now supports **Postman-style nested environment variables**, enabling dynamic variable key construction similar to Postman's advanced templating capabilities. This feature reduces the need to create multiple environment sets and provides more flexible variable management.

## Features Added

### 1. **Dual Syntax Support**
- **Hoppscotch Syntax**: `<<variable>>`
- **Postman Syntax**: `{{variable}}` (NEW!)
- Both syntaxes can be used interchangeably

### 2. **Nested Variable Resolution** 
- **Simple Nested**: `{{{{country-code}}{{environment}}}}`
- **Complex Nested**: `{{base-url}}/{{{{service-prefix}}{{api-version}}}}`
- **Mixed Syntax**: `<<{{country}}>>` or `{{<<region>>}}`

### 3. **Dynamic Key Construction**
Users can now create dynamic variable names from other variables:

```
Variables:
- country-code: "US"
- environment: "PROD"
- USPROD: "https://us-api.prod.com"

Usage:
{{{{country-code}}{{environment}}}} → resolves to → https://us-api.prod.com
```

## Examples

### Before (Required 15+ environments)
```
Environment 1 (US-PROD):
- api-url: "https://us-api.prod.com"
- db-url: "https://us-db.prod.com"

Environment 2 (US-DEV):
- api-url: "https://us-api.dev.com"  
- db-url: "https://us-db.dev.com"

Environment 3 (EU-PROD):
- api-url: "https://eu-api.prod.com"
- db-url: "https://eu-db.prod.com"

... (12 more environments)
```

### After (Single dynamic environment)
```
Single Environment:
- country: "US"
- environment: "PROD"
- US-PROD-api: "https://us-api.prod.com"
- US-DEV-api: "https://us-api.dev.com"
- EU-PROD-api: "https://eu-api.prod.com"
- US-PROD-db: "https://us-db.prod.com"
- US-DEV-db: "https://us-db.dev.com"
- EU-PROD-db: "https://eu-db.prod.com"

Usage in requests:
- API URL: {{{{country}}-{{environment}}-api}}
- DB URL: {{{{country}}-{{environment}}-db}}

Change country="EU" and environment="DEV" → automatically switches to EU-DEV endpoints
```

## Advanced Use Cases

### 1. **Service Discovery Pattern**
```
Variables:
- service: "user-service"
- version: "v2"
- user-service-v2-endpoint: "https://api.example.com/users/v2"

Request URL: {{{{service}}-{{version}}-endpoint}}/profile
```

### 2. **Multi-tenant Configuration**
```
Variables:
- tenant: "acme-corp"
- region: "us-west"
- acme-corp-us-west-api: "https://acme.usw.api.com"
- acme-corp-us-west-auth: "https://acme.usw.auth.com"

Auth URL: {{{{tenant}}-{{region}}-auth}}/oauth/token
API URL: {{{{tenant}}-{{region}}-api}}/data
```

### 3. **Feature Flag Environments**
```
Variables:
- feature-flag: "new-ui"
- environment: "staging"
- new-ui-staging-url: "https://beta-ui.staging.com"
- old-ui-staging-url: "https://legacy.staging.com"

Dynamic URL: {{{{feature-flag}}-{{environment}}-url}}
```

## Technical Implementation

### Enhanced Parser Features
1. **Nested Resolution**: Up to 15 levels of nesting (increased from 10)
2. **Infinite Loop Protection**: Detects and prevents circular references
3. **Backward Compatibility**: All existing `<<variable>>` syntax continues to work
4. **Mixed Syntax Support**: Can combine both syntaxes in same template

### Resolution Order
1. **Nested Key Resolution**: First resolves variables within the key itself
2. **Predefined Variables**: Checks system predefined variables
3. **Environment Variables**: Searches current environment variables
4. **Global Variables**: Falls back to global variables
5. **Empty String**: Returns empty if variable not found (Postman behavior)

### Error Handling
- **Circular Reference**: Returns original template if circular dependency detected
- **Depth Limit**: Prevents infinite expansion with configurable depth limit
- **Secret Variables**: Properly handles masked/hidden values in nested context

## Migration Guide

### For Existing Users
- **No Breaking Changes**: All existing environments work as-is
- **Optional Adoption**: New syntax is opt-in, use when needed
- **Gradual Migration**: Can incrementally adopt nested variables

### Best Practices
1. **Use Consistent Naming**: Create clear variable naming conventions
2. **Document Patterns**: Comment complex nested variable structures  
3. **Test Thoroughly**: Verify nested resolution in different environments
4. **Avoid Deep Nesting**: Keep nesting levels reasonable for maintainability

## Performance Considerations
- **Caching**: Variable resolution results are not cached (matches Postman behavior)
- **Complexity**: Nested resolution has slightly higher computational cost
- **Limits**: 15-level depth limit prevents performance issues

## Comparison with Postman

| Feature | Hoppscotch | Postman |
|---------|------------|---------|
| Nested Variables | ✅ `{{{{key1}}{{key2}}}}` | ✅ `{{{{key1}}{{key2}}}}` |
| Dual Syntax | ✅ `<<var>>` + `{{var}}` | ❌ Only `{{var}}` |
| Depth Limit | ✅ 15 levels | ✅ ~10 levels |
| Circular Protection | ✅ Yes | ✅ Yes |
| Global Sharing | 🔄 Coming Soon | ✅ Yes |

## Future Enhancements

1. **Environment Trees**: Hierarchical environment organization
2. **Global Sharing**: Shared variables across users/teams  
3. **Variable Suggestions**: Auto-complete for nested variable construction
4. **Visual Designer**: UI for building complex nested variables
5. **Import/Export**: Enhanced Postman environment compatibility

## Examples for Common Scenarios

### API Testing Across Multiple Environments
```bash
# Variables setup:
country=US
env=PROD  
US-PROD-base=https://api.us.prod.example.com
US-DEV-base=https://api.us.dev.example.com
EU-PROD-base=https://api.eu.prod.example.com

# Request URL:
{{{{country}}-{{env}}-base}}/users/profile

# Easy switching: Change country="EU", env="DEV" 
# → Automatically uses https://api.eu.dev.example.com
```

This enhancement brings Hoppscotch's environment variable system to parity with Postman while maintaining backward compatibility and adding unique features like dual syntax support.