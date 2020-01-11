export default function runTestScriptWitVariables(script, variables) {

  let pw = {
    _errors: [],
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

function expect(expectValue) {
  return new Expectation(expectValue);
}

class Expectation {
  constructor(expectValue, _not, _testReports) {
    this.expectValue = expectValue;
    this.not = _not || new Expectation(this.expectValue, true);
    this._testReports = _testReports; // this values is used within Test.it, which wraps Expectation and passes _testReports value.
    this._satisfies = function(targetValue) {
      // Used for testing if two values match the expectation, which could be === OR !==, depending on if not
      // was used. Expectation#_satisfies prevents the need to have an if(this.not) branch in every test method.
      if (this.not === true) {
        // test the inverse. this.not is always truthly, but an Expectation that is inverted will always be strictly `true`
        return this.expectValue !== targetValue;
      } else {
        return this.expectValue === targetValue;
      }
    }
  }
  _fmtNot(message) {
    // given a string with "(not)" in it, replaces with "not" or "", depending if the expectation is expecting the positive or inverse (this._not)
    if (this.not === true) {
      return message.replace("(not)", "not ");
    } else {
      return message.replace("(not)", "")
    }
  }
  _fail(message) {
    if (this._testReports) {
      this._testReports.push({pass: false, message})
    } else {
      throw {message}
    }
  }
  _pass(message) {
    if (this._testReports) {
      this._testReports.push({pass: true, message});
    } else {
      return true;
    }
  }
  // TEST METHODS DEFINED BELOW
  // these are the usual methods that would follow expect(...)
  toBe(value) {
    return this._satisfies(value) ? this._pass() : this._fail(this._fmtNot(`Expected ${this.expectValue} (not)to be ${value}`));
  }
  toHaveProperty(value) {
    return this._satisfies(this.expectValue.hasOwnProperty(value)) ? this._pass() : this._fail(`Expected object ${this.expectValue} to (not)have property ${value}`)
  }
}

class PostwomanTestFailure {
  constructor(message) {
    return {message}
  }
}
