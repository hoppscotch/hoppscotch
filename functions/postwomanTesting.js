export default function runTestScriptWitVariables(script, variables) {

  let pw = {
    assert
    // globals that the script is allowed to have access to.
  };
  Object.assign(pw, variables);

  // run pre-request script within this function so that it has access to the pw object.
  let errors = null;
  try {
    new Function("pw", script)(pw);
  }
  catch (e) {
    errors = e;
  }
  return errors;

}

function assert(expression) {
  if (!expression) {
    throw {name: "PostWomanTestError", message: "expression evaluated to false"}
  }
}

class PostwomanTestFailure {
  constructor(message) {
    return {message}
  }
}
