// Regex to match environment variables in the format `<<variable_name>>`/`<<variable.name>>` etc.
// This is used to identify if the request contains environment variables that need to be handled specially.

const ENV_VAR_NAME_PATTERN = "[a-zA-Z0-9_.-]+"
const HOPP_ENVIRONMENT_REGEX = new RegExp(`(<<${ENV_VAR_NAME_PATTERN}>>)`, "g")
const ENV_VAR_NAME_REGEX = new RegExp(ENV_VAR_NAME_PATTERN)

export { HOPP_ENVIRONMENT_REGEX, ENV_VAR_NAME_REGEX }
