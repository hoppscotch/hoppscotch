import { HoppRESTRequest, Environment } from "@hoppscotch/data"

export const mockRequest: HoppRESTRequest = {
  v: "14",
  method: "GET",
  endpoint: "https://api.example.com/data",
  headers: [],
  params: [],
  body: { contentType: "application/json", body: "" },
  auth: {
    authActive: false,
    authType: "none",
  },
  name: "Mock Request",
  preRequestScript: "",
  testScript: "",
  requestVariables: [],
  responses: {},
}

export const mockEnvVars: Environment["variables"] = [
  {
    key: "API_KEY",
    secret: false,
    initialValue: "test-key-123",
    currentValue: "test-key-123",
  },
  {
    key: "API_VALUE",
    secret: true,
    initialValue: "secret-value",
    currentValue: "secret-value",
  },
  {
    key: "ACCESS_TOKEN",
    secret: true,
    initialValue: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    currentValue: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  },
  {
    key: "USERNAME",
    secret: false,
    initialValue: "testuser",
    currentValue: "testuser",
  },
  {
    key: "PASSWORD",
    secret: true,
    initialValue: "testpass",
    currentValue: "testpass",
  },
  {
    key: "OAUTH_TOKEN",
    secret: true,
    initialValue: "oauth2_access_token_123",
    currentValue: "oauth2_access_token_123",
  },
  {
    key: "JWT_SECRET",
    secret: true,
    initialValue: "my-secret-key",
    currentValue: "my-secret-key",
  },
  {
    key: "JWT_PAYLOAD",
    secret: false,
    initialValue: '{"sub": "1234567890", "name": "John Doe"}',
    currentValue: '{"sub": "1234567890", "name": "John Doe"}',
  },
  {
    key: "AWS_ACCESS_KEY",
    secret: true,
    initialValue: "AKIAIOSFODNN7EXAMPLE",
    currentValue: "AKIAIOSFODNN7EXAMPLE",
  },
  {
    key: "AWS_SECRET_KEY",
    secret: true,
    initialValue: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    currentValue: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  },
  {
    key: "AWS_REGION",
    secret: false,
    initialValue: "us-east-1",
    currentValue: "us-east-1",
  },
  {
    key: "HAWK_ID",
    secret: false,
    initialValue: "test-hawk-id",
    currentValue: "test-hawk-id",
  },
  {
    key: "HAWK_KEY",
    secret: true,
    initialValue: "test-hawk-key",
    currentValue: "test-hawk-key",
  },
  {
    key: "DIGEST_USER",
    secret: false,
    initialValue: "testuser",
    currentValue: "testuser",
  },
  {
    key: "DIGEST_PASS",
    secret: true,
    initialValue: "testpass",
    currentValue: "testpass",
  },
]
