export const commonOAuth2AuthParams = [
  "audience",
  "scope",
  "state",
  "nonce",
  "prompt",
  "max_age",
  "ui_locales",
  "id_token_hint",
  "login_hint",
  "acr_values",
  "response_mode",
  "display",
  "claims",
  "request",
  "request_uri",
]

export const commonOAuth2TokenParams = [
  "grant_type",
  "code",
  "redirect_uri",
  "client_id",
  "client_secret",
  "code_verifier",
  "username",
  "password",
  "scope",
  "audience",
  "resource",
  "assertion",
  "assertion_type",
  "refresh_token",
]

export const commonOAuth2RefreshParams = [
  "grant_type",
  "refresh_token",
  "client_id",
  "client_secret",
  "scope",
  "audience",
  "resource",
]

export const sendInOptions = ["body", "url", "headers"] as const
export const sendInOptionsLabels = {
  body: "Request Body",
  url: "Request URL",
  headers: "Request Headers",
}
