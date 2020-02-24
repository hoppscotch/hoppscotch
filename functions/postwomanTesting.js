const PASS = 'PASS'
const FAIL = 'FAIL'
const ERROR = 'ERROR'

const styles = {
  [PASS]: { icon: 'check', class: 'success-response' },
  [FAIL]: { icon: 'close', class: 'cl-error-response' },
  [ERROR]: { icon: 'close', class: 'cl-error-response' },
  none: { icon: '', class: '' },
}

// TODO: probably have to use a more global state for `test`

export default function runTestScriptWithVariables(script, variables) {
  let pw = {
    _errors: [],
    _testReports: [],
    _report: '',
    expect(value) {
      try {
        return expect(value, this._testReports)
      } catch (e) {
        pw._testReports.push({ result: ERROR, message: e })
      }
    },
    test: (descriptor, func) => test(descriptor, func, pw._testReports),
    // globals that the script is allowed to have access to.
  }
  Object.assign(pw, variables)

  // run pre-request script within this function so that it has access to the pw object.
  new Function('pw', script)(pw)
  //
  const testReports = pw._testReports.map(item => {
    if (item.result) {
      item.styles = styles[item.result]
    } else {
      item.styles = styles.none
    }
    return item
  })
  return { report: pw._report, errors: pw._errors, testResults: testReports }
}

function test(descriptor, func, _testReports) {
  _testReports.push({ startBlock: descriptor })
  try {
    func()
  } catch (e) {
    _testReports.push({ result: ERROR, message: e })
  }
  _testReports.push({ endBlock: true })

  // TODO: Organize and generate text report of each {descriptor: true} section in testReports.
  // add checkmark or x depending on if each testReport is pass=true or pass=false
}

function expect(expectValue, _testReports) {
  return new Expectation(expectValue, null, _testReports)
}

class Expectation {
  constructor(expectValue, _not, _testReports) {
    this.expectValue = expectValue
    this.not = _not || new Expectation(this.expectValue, true, _testReports)
    this._testReports = _testReports // this values is used within Test.it, which wraps Expectation and passes _testReports value.
    this._satisfies = function(expectValue, targetValue) {
      // Used for testing if two values match the expectation, which could be === OR !==, depending on if not
      // was used. Expectation#_satisfies prevents the need to have an if(this.not) branch in every test method.
      // Signature is _satisfies([expectValue,] targetValue): if only one argument is given, it is assumed the targetValue, and expectValue is set to this.expectValue
      if (!targetValue) {
        targetValue = expectValue
        expectValue = this.expectValue
      }
      if (this.not === true) {
        // test the inverse. this.not is always truthly, but an Expectation that is inverted will always be strictly `true`
        return expectValue !== targetValue
      } else {
        return expectValue === targetValue
      }
    }
  }
  _fmtNot(message) {
    // given a string with "(not)" in it, replaces with "not" or "", depending if the expectation is expecting the positive or inverse (this._not)
    if (this.not === true) {
      return message.replace('(not)', 'not ')
    } else {
      return message.replace('(not)', '')
    }
  }
  _fail(message) {
    this._testReports.push({ result: FAIL, message })
  }
  _pass(message) {
    this._testReports.push({ result: PASS })
  }
  // TEST METHODS DEFINED BELOW
  // these are the usual methods that would follow expect(...)
  toBe(value) {
    return this._satisfies(value)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected ${this.expectValue} (not)to be ${value}`))
  }
  toHaveProperty(value) {
    return this._satisfies(this.expectValue.hasOwnProperty(value), true)
      ? this._pass()
      : this._fail(
          this._fmtNot(`Expected object ${this.expectValue} to (not)have property ${value}`)
        )
  }
  toBeLevel2xx() {
    const code = parseInt(this.expectValue)
    if (Number.isNaN(code)) {
      return this._fail(`Expected 200-level status but could not parse value ${this.expectValue}`)
    }
    return this._satisfies(code >= 200 && code < 300)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 200-level status`))
  }
  toBeLevel3xx() {
    const code = parseInt(this.expectValue)
    if (Number.isNaN(code)) {
      return this._fail(`Expected 300-level status but could not parse value ${this.expectValue}`)
    }
    return this._satisfies(code >= 300 && code < 400)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 300-level status`))
  }
  toBeLevel4xx() {
    const code = parseInt(this.expectValue)
    if (Number.isNaN(code)) {
      return this._fail(`Expected 400-level status but could not parse value ${this.expectValue}`)
    }
    return this._satisfies(code >= 400 && code < 500)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 400-level status`))
  }
  toBeLevel5xx() {
    const code = parseInt(this.expectValue)
    if (Number.isNaN(code)) {
      return this._fail(`Expected 500-level status but could not parse value ${this.expectValue}`)
    }
    return this._satisfies(code >= 500 && code < 600)
      ? this._pass()
      : this._fail(this._fmtNot(`Expected ${this.expectValue} to (not)be 500-level status`))
  }
}
