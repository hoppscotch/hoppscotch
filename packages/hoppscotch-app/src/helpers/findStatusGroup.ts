export default function (responseStatus) {
  if (responseStatus >= 100 && responseStatus < 200)
    return {
      name: "informational",
      className: "info-response",
    }

  if (responseStatus >= 200 && responseStatus < 300)
    return {
      name: "successful",
      className: "success-response",
    }

  if (responseStatus >= 300 && responseStatus < 400)
    return {
      name: "redirection",
      className: "redir-response",
    }

  if (responseStatus >= 400 && responseStatus < 500)
    return {
      name: "client error",
      className: "cl-error-response",
    }

  if (responseStatus >= 500 && responseStatus < 600)
    return {
      name: "server error",
      className: "sv-error-response",
    }

  // this object is a catch-all for when no other objects match and should always be last
  return {
    name: "unknown",
    className: "missing-data-response",
  }
}
