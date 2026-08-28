// Regex to match environment variables in the format `<<variable_name>>`/`<<variable.name>>` etc.
// This is used to identify if the request contains environment variables that need to be handled specially.

const ENV_VAR_NAME_PATTERN = "[a-zA-Z0-9_.-]+"

// Global variant, used to extract every occurrence in a string via
// `String.prototype.match` and CodeMirror's `MatchDecorator`.
const HOPP_ENVIRONMENT_REGEX = new RegExp(`(<<${ENV_VAR_NAME_PATTERN}>>)`, "g")

// Non-global variant, used for stateless `.test()` containment checks.
// A global regex must not be used with `.test()`: it keeps a `lastIndex`
// between calls, so testing the same (or a shorter) string repeatedly returns
// alternating/incorrect results, and the state leaks across every module that
// shares the regex.
const HOPP_ENVIRONMENT_TEST_REGEX = new RegExp(`(<<${ENV_VAR_NAME_PATTERN}>>)`)

const ENV_VAR_NAME_REGEX = new RegExp(ENV_VAR_NAME_PATTERN)

export { HOPP_ENVIRONMENT_REGEX, HOPP_ENVIRONMENT_TEST_REGEX, ENV_VAR_NAME_REGEX }
