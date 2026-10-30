// Regex to match environment variables in the format `<<variable_name>>`/`<<variable.name>>` etc.
// This is used to identify if the request contains environment variables that need to be handled specially.

const ENV_VAR_NAME_PATTERN = "[a-zA-Z0-9_.-]+"

// Global variant, used to extract every occurrence in a string via
// `String.prototype.match` and CodeMirror's `MatchDecorator`.
const HOPP_ENVIRONMENT_REGEX = new RegExp(`(<<${ENV_VAR_NAME_PATTERN}>>)`, "g")

// For `.test()` containment checks — a global regex is stateful with `.test()`
// (lastIndex leaks across calls and modules), so a non-global copy is needed.
const HOPP_ENVIRONMENT_TEST_REGEX = new RegExp(`(<<${ENV_VAR_NAME_PATTERN}>>)`)

const ENV_VAR_NAME_REGEX = new RegExp(ENV_VAR_NAME_PATTERN)

export { HOPP_ENVIRONMENT_REGEX, HOPP_ENVIRONMENT_TEST_REGEX, ENV_VAR_NAME_REGEX }
