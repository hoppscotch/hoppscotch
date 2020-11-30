const statusCategories = () => [
  {
    name: "informational",
    statusCodeRegex: new RegExp(/[1][0-9]+/),
    className: "info-response",
  },
  {
    name: "successful",
    statusCodeRegex: new RegExp(/[2][0-9]+/),
    className: "success-response",
  },
  {
    name: "redirection",
    statusCodeRegex: new RegExp(/[3][0-9]+/),
    className: "redir-response",
  },
  {
    name: "client error",
    statusCodeRegex: new RegExp(/[4][0-9]+/),
    className: "cl-error-response",
  },
  {
    name: "server error",
    statusCodeRegex: new RegExp(/[5][0-9]+/),
    className: "sv-error-response",
  },
  {
    // this object is a catch-all for when no other objects match and should always be last
    name: "unknown",
    statusCodeRegex: new RegExp(/.*/),
    className: "missing-data-response",
  },
]

export default findStatusGroup = (responseStatus) =>
  statusCategories.find(({ statusCodeRegex }) => statusCodeRegex.test(responseStatus))
