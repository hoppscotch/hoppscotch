export default function getEnvironmentVariablesFromScript(script) {
  let _variables = {};

  // the pw object is the proxy by which pre-request scripts can pass variables to the request.
  // for security and control purposes, this is the only way a pre-request script should modify variables.
  let pw = {
    environment: {
      set: (key, value) => _variables[key] = value,
    },
    env: {
      set: (key, value) => _variables[key] = value,
    },
    // globals that the script is allowed to have access to.
  };

  // run pre-request script within this function so that it has access to the pw object.
  (new Function('pw', script))(pw);

  return _variables;
}
