import { parseTemplateStringE } from "./index"
import { Environment } from "./index"

// Test data matching your use case
const testEnvironment: Environment["variables"] = [
  // Base configuration variables
  { key: "country-code", currentValue: "US", initialValue: "US", secret: false },
  { key: "environment", currentValue: "PROD", initialValue: "PROD", secret: false },
  { key: "service", currentValue: "api", initialValue: "api", secret: false },
  
  // Dynamic endpoint configurations (15 combinations)
  { key: "US-PROD-api", currentValue: "https://us-api.prod.com", initialValue: "https://us-api.prod.com", secret: false },
  { key: "US-DEV-api", currentValue: "https://us-api.dev.com", initialValue: "https://us-api.dev.com", secret: false },
  { key: "US-STAGING-api", currentValue: "https://us-api.staging.com", initialValue: "https://us-api.staging.com", secret: false },
  { key: "EU-PROD-api", currentValue: "https://eu-api.prod.com", initialValue: "https://eu-api.prod.com", secret: false },
  { key: "EU-DEV-api", currentValue: "https://eu-api.dev.com", initialValue: "https://eu-api.dev.com", secret: false },
  { key: "EU-STAGING-api", currentValue: "https://eu-api.staging.com", initialValue: "https://eu-api.staging.com", secret: false },
  { key: "APAC-PROD-api", currentValue: "https://apac-api.prod.com", initialValue: "https://apac-api.prod.com", secret: false },
  { key: "APAC-DEV-api", currentValue: "https://apac-api.dev.com", initialValue: "https://apac-api.dev.com", secret: false },
  { key: "APAC-STAGING-api", currentValue: "https://apac-api.staging.com", initialValue: "https://apac-api.staging.com", secret: false },
  
  // Database configurations
  { key: "US-PROD-db", currentValue: "postgres://us-db.prod.com:5432", initialValue: "postgres://us-db.prod.com:5432", secret: false },
  { key: "EU-PROD-db", currentValue: "postgres://eu-db.prod.com:5432", initialValue: "postgres://eu-db.prod.com:5432", secret: false },
  { key: "APAC-PROD-db", currentValue: "postgres://apac-db.prod.com:5432", initialValue: "postgres://apac-db.prod.com:5432", secret: false },
  
  // Auth endpoints
  { key: "US-PROD-auth", currentValue: "https://us-auth.prod.com/oauth", initialValue: "https://us-auth.prod.com/oauth", secret: false },
  { key: "EU-PROD-auth", currentValue: "https://eu-auth.prod.com/oauth", initialValue: "https://eu-auth.prod.com/oauth", secret: false },
  { key: "APAC-PROD-auth", currentValue: "https://apac-auth.prod.com/oauth", initialValue: "https://apac-auth.prod.com/oauth", secret: false },
]

// Test cases demonstrating nested variable functionality
console.log("=== NESTED ENVIRONMENT VARIABLES TEST ===\\n")

// Test 1: Basic nested variable resolution (your main use case)
console.log("1. Basic Nested Resolution:")
const basicNested = "{{{{country-code}}-{{environment}}-{{service}}}}"
const result1 = parseTemplateStringE(basicNested, testEnvironment)
console.log(`Input: ${basicNested}`)
console.log(`Output: ${result1._tag === 'Right' ? result1.right : 'ERROR: ' + result1.left}`)
console.log(`Expected: https://us-api.prod.com\\n`)

// Test 2: Postman-style nested in URL construction
console.log("2. URL Construction with Nested Variables:")
const urlTemplate = "{{{{country-code}}-{{environment}}-{{service}}}}/users/profile?region={{country-code}}"
const result2 = parseTemplateStringE(urlTemplate, testEnvironment)
console.log(`Input: ${urlTemplate}`)
console.log(`Output: ${result2._tag === 'Right' ? result2.right : 'ERROR: ' + result2.left}`)
console.log(`Expected: https://us-api.prod.com/users/profile?region=US\\n`)

// Test 3: Database connection
console.log("3. Database Connection:")
const dbTemplate = "{{{{country-code}}-{{environment}}-db}}"
const result3 = parseTemplateStringE(dbTemplate, testEnvironment)
console.log(`Input: ${dbTemplate}`)
console.log(`Output: ${result3._tag === 'Right' ? result3.right : 'ERROR: ' + result3.left}`)
console.log(`Expected: postgres://us-db.prod.com:5432\\n`)

// Test 4: Auth endpoint
console.log("4. Authentication Endpoint:")
const authTemplate = "{{{{country-code}}-{{environment}}-auth}}/token"
const result4 = parseTemplateStringE(authTemplate, testEnvironment)
console.log(`Input: ${authTemplate}`)
console.log(`Output: ${result4._tag === 'Right' ? result4.right : 'ERROR: ' + result4.left}`)
console.log(`Expected: https://us-auth.prod.com/oauth/token\\n`)

// Test 5: Mixed syntax (Hoppscotch + Postman)
console.log("5. Mixed Syntax Support:")
const mixedTemplate = "<<{{country-code}}-{{environment}}-{{service}}>/api/v1"
const result5 = parseTemplateStringE(mixedTemplate, testEnvironment)
console.log(`Input: ${mixedTemplate}`)
console.log(`Output: ${result5._tag === 'Right' ? result5.right : 'ERROR: ' + result5.left}\\n`)

// Test 6: Switching environments dynamically
console.log("6. Dynamic Environment Switching:")
const dynamicEnv: Environment["variables"] = [
  ...testEnvironment.map(v => 
    v.key === "country-code" ? { ...v, currentValue: "EU" } :
    v.key === "environment" ? { ...v, currentValue: "DEV" } : v
  )
]

const result6 = parseTemplateStringE(basicNested, dynamicEnv)
console.log(`Switched to: country-code=EU, environment=DEV`)
console.log(`Input: ${basicNested}`)
console.log(`Output: ${result6._tag === 'Right' ? result6.right : 'ERROR: ' + result6.left}`)
console.log(`Expected: https://eu-api.dev.com\\n`)

// Test 7: Complex nested example
console.log("7. Complex Multi-Level Nesting:")
const complexEnv: Environment["variables"] = [
  { key: "prefix", currentValue: "api", initialValue: "api", secret: false },
  { key: "version", currentValue: "v2", initialValue: "v2", secret: false },
  { key: "region", currentValue: "us-west", initialValue: "us-west", secret: false },
  { key: "api-v2", currentValue: "service-endpoint", initialValue: "service-endpoint", secret: false },
  { key: "service-endpoint-us-west", currentValue: "https://api.uswest.example.com/v2", initialValue: "https://api.uswest.example.com/v2", secret: false },
]

const complexTemplate = "{{{{{{prefix}}-{{version}}}}-{{region}}}}/data"
const result7 = parseTemplateStringE(complexTemplate, complexEnv)
console.log(`Input: ${complexTemplate}`)
console.log(`Output: ${result7._tag === 'Right' ? result7.right : 'ERROR: ' + result7.left}`)
console.log(`Expected: https://api.uswest.example.com/v2/data\\n`)

console.log("=== COMPARISON: BEFORE vs AFTER ===")
console.log("BEFORE: Required 15+ separate environments")
console.log("AFTER: 1 dynamic environment with nested variables")
console.log("\\nBenefits:")
console.log("- Reduced configuration complexity")
console.log("- Dynamic switching by changing base variables")
console.log("- Postman compatibility") 
console.log("- Backward compatibility with existing <<>> syntax")