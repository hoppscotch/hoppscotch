export const getDefaultOAuthRedirectURI = () =>
  `${window.location.origin}/oauth`

export const getOAuthRedirectURI = (flowConfig?: { redirectURI?: string }) =>
  flowConfig?.redirectURI?.trim() || getDefaultOAuthRedirectURI()
