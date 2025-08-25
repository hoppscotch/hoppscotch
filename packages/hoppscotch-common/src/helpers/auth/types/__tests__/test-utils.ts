import { Environment, makeRESTRequest } from "@hoppscotch/data"

// Helper function to create base request
export const createBaseRequest = (
  overrides: Partial<Parameters<typeof makeRESTRequest>[0]> = {}
) => {
  const baseRequest: Parameters<typeof makeRESTRequest>[0] = {
    method: "GET",
    endpoint: "https://api.example.com/data",
    name: "Test Request",
    params: [],
    headers: [],
    preRequestScript: "",
    testScript: "",
    auth: {
      authType: "inherit",
      authActive: true,
    },
    body: {
      contentType: null,
      body: null,
    },
    requestVariables: [],
    responses: {},
  }

  return makeRESTRequest({ ...baseRequest, ...overrides })
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
