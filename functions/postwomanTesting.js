import {parse} from "graphql";

export default function runTestScriptWitVariables(script, variables) {

  let pw = {
    _errors: [],
    _report: '',
    expect,
    test
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

function test(descriptor, func) {
  let testReports = [];
  let expect = (expectValue) => new Expectation(expectValue, undefined, testReports);
  let it = (descriptor, func) => {
    testReports.push({descriptor: true, message: descriptor});
    func();
  };
  let xit = (descriptor, func) => {
    testReports.push({descriptor: true, message: `⊖ ${descriptor} [skipped]`})
  };

  func();

  // TODO: Organieze and generate text report of each {descriptor: true} section in testReports.
  // add checkmark or x depending on if each testReport is pass=true or pass=false
}

function expect(expectValue) {
  return new Expectation(expectValue);
}

class Expectation {
  constructor(expectValue, _not, _testReports) {
    this.expectValue = expectValue;
    this.not = _not || new Expectation(this.expectValue, true, _testReports);
    this._testReports = _testReports; // this values is used within Test.it, which wraps Expectation and passes _testReports value.
    this._satisfies = function(expectValue, targetValue) {
      // Used for testing if two values match the expectation, which could be === OR !==, depending on if not
      // was used. Expectation#_satisfies prevents the need to have an if(this.not) branch in every test method.
      // Signature is _satisfies([expectValue,] targetValue): if only one argument is given, it is assumed the targetValue, and expectValue is set to this.expectValue
      if (!targetValue) {
        targetValue = expectValue;
        expectValue = this.expectValue;
      }
      if (this.not === true) {
        // test the inverse. this.not is always truthly, but an Expectation that is inverted will always be strictly `true`
        return expectValue !== targetValue;
      } else {
        return expectValue === targetValue;
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
    return this._satisfies(value)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected ${this.expectValue} (not)to be ${value}`));
  }
  toHaveProperty(value) {
    return this._satisfies(this.expectValue.hasOwnProperty(value), true)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected object ${this.expectValue} to (not)have property ${value}`))
  }
  toBeLevel2xx() {
    let code = parseInt(this.expectValue);
    if (Number.isNaN(code)) {
      return this._fail(`Expecteded 200-level status but could not parse value ${this.expectValue}`);
    }
    return this._satisfies(code >= 200 && code < 300)
      ? this._pass() :
      this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 200-level status`));
  }
  toBeLevel3xx() {
    let code = parseInt(this.expectValue);
    if (Number.isNaN(code)) {
      return this._fail(`Expected 300-level status but could not parse value ${this.expectValue}`);
    }
    return this._satisfies(code >= 300 && code < 400)
      ? this._pass() :
      this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 300-level status`));
  }
  toBeLevel4xx() {
    let code = parseInt(this.expectValue);
    if (Number.isNaN(code)) {
      return this._fail(`Expected 400-level status but could not parse value ${this.expectValue}`);
    }
    return this._satisfies(code >= 400 && code < 500)
      ? this._pass() :
      this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 400-level status`));
  }
  toBeLevel5xx() {
    let code = parseInt(this.expectValue);
    if (Number.isNaN(code)) {
      return this._fail(`Expected 200-level status but could not parse value ${this.expectValue}`);
    }
    return this._satisfies(code >= 500 && code < 600)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 500-level status`));
  }
}

class PostwomanTestFailure {
  constructor(message) {
    return {message}
  }
}
