// Regex to match environment variables in the format `<<variable_name>>`/`<<variable.name>>` etc.
// This is used to identify if the request contains environment variables that need to be handled specially.

const ENV_VAR_NAME_PATTERN = "[a-zA-Z0-9_.-]+"
const ENV_VAR_SOURCE = `(<<${ENV_VAR_NAME_PATTERN}>>)`

// The shared matcher. Deliberately NOT flagged `g`: a global RegExp keeps its
// `lastIndex` between calls, so `.test()` on a shared instance answers `true`
// on one call and `false` on the next for the very same input.
const HOPP_ENVIRONMENT_REGEX = new RegExp(ENV_VAR_SOURCE)

// A `g` flagged copy for the consumers that need every match in a string
// (`String#match` with the `g` flag) or a global RegExp (CodeMirror's
// `MatchDecorator` requires one). Global RegExps carry `lastIndex`, so this
// copy is kept apart from the stateless matcher above.
const HOPP_ENVIRONMENT_REGEX_GLOBAL = new RegExp(ENV_VAR_SOURCE, "g")

const ENV_VAR_NAME_REGEX = new RegExp(ENV_VAR_NAME_PATTERN)

export {
  ENV_VAR_NAME_REGEX,
  HOPP_ENVIRONMENT_REGEX,
  HOPP_ENVIRONMENT_REGEX_GLOBAL,
}
