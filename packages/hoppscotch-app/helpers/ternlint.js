/* eslint-disable */

import infer from "tern/lib/infer"
import tern from "tern/lib/tern"

const walk = require("acorn-walk")

var defaultRules = {
  UnknownProperty: { severity: "warning" },
  UnknownIdentifier: { severity: "warning" },
  NotAFunction: { severity: "error" },
  InvalidArgument: { severity: "error" },
  UnusedVariable: { severity: "warning" },
  UnknownModule: { severity: "error" },
  MixedReturnTypes: { severity: "warning" },
  ObjectLiteral: { severity: "error" },
  TypeMismatch: { severity: "warning" },
  Array: { severity: "error" },
  ES6Modules: { severity: "error" },
}

function makeVisitors(server, query, file, messages) {
  function addMessage(node, msg, severity) {
    var error = makeError(node, msg, severity)
    messages.push(error)
  }

  function makeError(node, msg, severity) {
    var pos = getPosition(node)
    var error = {
      message: msg,
      from: tern.outputPos(query, file, pos.start),
      to: tern.outputPos(query, file, pos.end),
      severity: severity,
    }
    if (query.lineNumber) {
      error.lineNumber = query.lineCharPositions
        ? error.from.line
        : tern.outputPos({ lineCharPositions: true }, file, pos.start).line
    }
    if (!query.groupByFiles) error.file = file.name
    return error
  }

  function getNodeName(node) {
    if (node.callee) {
      // This is a CallExpression node.
      // We get the position of the function name.
      return getNodeName(node.callee)
    } else if (node.property) {
      // This is a MemberExpression node.
      // We get the name of the property.
      return node.property.name
    } else {
      return node.name
    }
  }

  function getNodeValue(node) {
    if (node.callee) {
      // This is a CallExpression node.
      // We get the position of the function name.
      return getNodeValue(node.callee)
    } else if (node.property) {
      // This is a MemberExpression node.
      // We get the value of the property.
      return node.property.value
    } else {
      if (node.type === "Identifier") {
        var query = { type: "definition", start: node.start, end: node.end }
        var expr = tern.findQueryExpr(file, query)
        var type = infer.expressionType(expr)
        var objExpr = type.getType()
        if (objExpr && objExpr.originNode)
          return getNodeValue(objExpr.originNode)
        return null
      }
      return node.value
    }
  }

  function getPosition(node) {
    if (node.callee) {
      // This is a CallExpression node.
      // We get the position of the function name.
      return getPosition(node.callee)
    }
    if (node.property) {
      // This is a MemberExpression node.
      // We get the position of the property.
      return node.property
    }
    return node
  }

  function getTypeName(type) {
    if (!type) return "Unknown type"
    if (type.types) {
      // multiple types
      var types = type.types,
        s = ""
      for (var i = 0; i < types.length; i++) {
        if (i > 0) s += "|"
        var t = getTypeName(types[i])
        if (t != "Unknown type") s += t
      }
      return s == "" ? "Unknown type" : s
    }
    if (type.name) {
      return type.name
    }
    return type.proto ? type.proto.name : "Unknown type"
  }

  function hasProto(expectedType, name) {
    if (!expectedType) return false
    if (!expectedType.proto) return false
    return expectedType.proto.name === name
  }

  function isRegexExpected(expectedType) {
    return hasProto(expectedType, "RegExp.prototype")
  }

  function isEmptyType(val) {
    return !val || (val.types && val.types.length == 0)
  }

  function compareType(expected, actual) {
    if (isEmptyType(expected) || isEmptyType(actual)) return true
    if (expected.types) {
      for (var i = 0; i < expected.types.length; i++) {
        if (actual.types) {
          for (var j = 0; j < actual.types.length; j++) {
            if (compareType(expected.types[i], actual.types[j])) return true
          }
        } else {
          if (compareType(expected.types[i], actual.getType())) return true
        }
      }
      return false
    } else if (actual.types) {
      for (var i = 0; i < actual.types.length; i++) {
        if (compareType(expected.getType(), actual.types[i])) return true
      }
    }
    var expectedType = expected.getType(),
      actualType = actual.getType()
    if (!expectedType || !actualType) return true
    var currentProto = actualType.proto
    while (currentProto) {
      if (expectedType.proto && expectedType.proto.name === currentProto.name)
        return true
      currentProto = currentProto.proto
    }
    return false
  }

  function checkPropsInObject(node, expectedArg, actualObj, invalidArgument) {
    var properties = node.properties,
      expectedObj = expectedArg.getType()
    for (var i = 0; i < properties.length; i++) {
      var property = properties[i],
        key = property.key,
        prop = key && key.name,
        value = property.value
      if (prop) {
        var expectedType = expectedObj.hasProp(prop)
        if (!expectedType) {
          // key doesn't exists
          addMessage(
            key,
            "Invalid property at " +
              (i + 1) +
              ": " +
              prop +
              " is not a property in " +
              getTypeName(expectedArg),
            invalidArgument.severity
          )
        } else {
          // test that each object literal prop is the correct type
          var actualType = actualObj.props[prop]
          if (!compareType(expectedType, actualType)) {
            addMessage(
              value,
              "Invalid property at " +
                (i + 1) +
                ": cannot convert from " +
                getTypeName(actualType) +
                " to " +
                getTypeName(expectedType),
              invalidArgument.severity
            )
          }
        }
      }
    }
  }

  function checkItemInArray(node, expectedArg, state, invalidArgument) {
    var elements = node.elements,
      expectedType = expectedArg.hasProp("<i>")
    for (var i = 0; i < elements.length; i++) {
      var elt = elements[i],
        actualType = infer.expressionType({ node: elt, state: state })
      if (!compareType(expectedType, actualType)) {
        addMessage(
          elt,
          "Invalid item at " +
            (i + 1) +
            ": cannot convert from " +
            getTypeName(actualType) +
            " to " +
            getTypeName(expectedType),
          invalidArgument.severity
        )
      }
    }
  }

  function isObjectLiteral(type) {
    var objType = type.getObjType()
    return objType && objType.proto && objType.proto.name == "Object.prototype"
  }

  function getFunctionLint(fnType) {
    if (fnType.lint) return fnType.lint
    if (fnType.metaData) {
      fnType.lint = getLint(fnType.metaData["!lint"])
      return fnType.lint
    }
  }

  function isFunctionType(type) {
    if (type.types) {
      for (var i = 0; i < type.types.length; i++) {
        if (isFunctionType(type.types[i])) return true
      }
    }
    return type.proto && type.proto.name == "Function.prototype"
  }

  function validateCallExpression(node, state, c) {
    var notAFunctionRule = getRule("NotAFunction"),
      invalidArgument = getRule("InvalidArgument")
    if (!notAFunctionRule && !invalidArgument) return
    var type = infer.expressionType({ node: node.callee, state: state })
    if (!type.isEmpty()) {
      // If type.isEmpty(), it is handled by MemberExpression/Identifier already.

      // An expression can have multiple possible (guessed) types.
      // If one of them is a function, type.getFunctionType() will return it.
      var fnType = type.getFunctionType()
      if (fnType == null) {
        if (notAFunctionRule && !isFunctionType(type))
          addMessage(
            node,
            "'" + getNodeName(node) + "' is not a function",
            notAFunctionRule.severity
          )
        return
      }
      var fnLint = getFunctionLint(fnType)
      var continueLint = fnLint ? fnLint(node, addMessage, getRule) : true
      if (continueLint && fnType.args) {
        // validate parameters of the function
        if (!invalidArgument) return
        var actualArgs = node.arguments
        if (!actualArgs) return
        var expectedArgs = fnType.args
        for (var i = 0; i < expectedArgs.length; i++) {
          var expectedArg = expectedArgs[i]
          if (actualArgs.length > i) {
            var actualNode = actualArgs[i]
            if (isRegexExpected(expectedArg.getType())) {
              var value = getNodeValue(actualNode)
              if (value) {
                try {
                  var regex = new RegExp(value)
                } catch (e) {
                  addMessage(
                    actualNode,
                    "Invalid argument at " + (i + 1) + ": " + e,
                    invalidArgument.severity
                  )
                }
              }
            } else {
              var actualArg = infer.expressionType({
                node: actualNode,
                state: state,
              })
              // if actual type is an Object literal and expected type is an object, we ignore
              // the comparison type since object literal properties validation is done inside "ObjectExpression".
              if (!(expectedArg.getObjType() && isObjectLiteral(actualArg))) {
                if (!compareType(expectedArg, actualArg)) {
                  addMessage(
                    actualNode,
                    "Invalid argument at " +
                      (i + 1) +
                      ": cannot convert from " +
                      getTypeName(actualArg) +
                      " to " +
                      getTypeName(expectedArg),
                    invalidArgument.severity
                  )
                }
              }
            }
          }
        }
      }
    }
  }

  function validateAssignement(nodeLeft, nodeRight, rule, state) {
    if (!nodeLeft || !nodeRight) return
    if (!rule) return
    var leftType = infer.expressionType({ node: nodeLeft, state: state }),
      rightType = infer.expressionType({ node: nodeRight, state: state })
    if (!compareType(leftType, rightType)) {
      addMessage(
        nodeRight,
        "Type mismatch: cannot convert from " +
          getTypeName(leftType) +
          " to " +
          getTypeName(rightType),
        rule.severity
      )
    }
  }

  function validateDeclaration(node, state, c) {
    function isUsedVariable(varNode, varState, file, srv) {
      var name = varNode.name

      for (
        var scope = varState;
        scope && !(name in scope.props);
        scope = scope.prev
      ) {}
      if (!scope) return false

      var hasRef = false
      function searchRef(file) {
        return function (node, scopeHere) {
          if (node != varNode) {
            hasRef = true
            throw new Error() // throw an error to stop the search.
          }
        }
      }

      try {
        if (scope.node) {
          // local scope
          infer.findRefs(scope.node, scope, name, scope, searchRef(file))
        } else {
          // global scope
          infer.findRefs(file.ast, file.scope, name, scope, searchRef(file))
          for (var i = 0; i < srv.files.length && !hasRef; ++i) {
            var cur = srv.files[i]
            if (cur != file)
              infer.findRefs(cur.ast, cur.scope, name, scope, searchRef(cur))
          }
        }
      } catch (e) {}
      return hasRef
    }

    var unusedRule = getRule("UnusedVariable"),
      mismatchRule = getRule("TypeMismatch")
    if (!unusedRule && !mismatchRule) return
    switch (node.type) {
      case "VariableDeclaration":
        for (var i = 0; i < node.declarations.length; ++i) {
          var decl = node.declarations[i],
            varNode = decl.id
          if (varNode.name != "✖") {
            // unused variable
            if (unusedRule && !isUsedVariable(varNode, state, file, server))
              addMessage(
                varNode,
                "Unused variable '" + getNodeName(varNode) + "'",
                unusedRule.severity
              )
            // type mismatch?
            if (mismatchRule)
              validateAssignement(varNode, decl.init, mismatchRule, state)
          }
        }
        break
      case "FunctionDeclaration":
        if (unusedRule) {
          var varNode = node.id
          if (
            varNode.name != "✖" &&
            !isUsedVariable(varNode, state, file, server)
          )
            addMessage(
              varNode,
              "Unused function '" + getNodeName(varNode) + "'",
              unusedRule.severity
            )
        }
        break
    }
  }

  function getArrType(type) {
    if (type instanceof infer.Arr) {
      return type.getObjType()
    } else if (type.types) {
      for (var i = 0; i < type.types.length; i++) {
        if (getArrType(type.types[i])) return type.types[i]
      }
    }
  }

  var visitors = {
    VariableDeclaration: validateDeclaration,
    FunctionDeclaration: validateDeclaration,
    ReturnStatement: function (node, state, c) {
      if (!node.argument) return
      var rule = getRule("MixedReturnTypes")
      if (!rule) return
      if (state.fnType && state.fnType.retval) {
        var actualType = infer.expressionType({
            node: node.argument,
            state: state,
          }),
          expectedType = state.fnType.retval
        if (!compareType(expectedType, actualType)) {
          addMessage(
            node,
            "Invalid return type : cannot convert from " +
              getTypeName(actualType) +
              " to " +
              getTypeName(expectedType),
            rule.severity
          )
        }
      }
    },
    // Detects expressions of the form `object.property`
    MemberExpression: function (node, state, c) {
      var rule = getRule("UnknownProperty")
      if (!rule) return
      var prop = node.property && node.property.name
      if (!prop || prop == "✖") return
      var type = infer.expressionType({ node: node, state: state })
      var parentType = infer.expressionType({ node: node.object, state: state })

      if (node.computed) {
        // Bracket notation.
        // Until we figure out how to handle these properly, we ignore these nodes.
        return
      }

      if (!parentType.isEmpty() && type.isEmpty()) {
        // The type of the property cannot be determined, which means
        // that the property probably doesn't exist.

        // We only do this check if the parent type is known,
        // otherwise we will generate errors for an entire chain of unknown
        // properties.

        // Also, the expression may be valid even if the parent type is unknown,
        // since the inference engine cannot detect the type in all cases.

        var propertyDefined = false

        // In some cases the type is unknown, even if the property is defined
        if (parentType.types) {
          // We cannot use parentType.hasProp or parentType.props - in the case of an AVal,
          // this may contain properties that are not really defined.
          parentType.types.forEach(function (potentialType) {
            // Obj#hasProp checks the prototype as well
            if (
              typeof potentialType.hasProp == "function" &&
              potentialType.hasProp(prop, true)
            ) {
              propertyDefined = true
            }
          })
        }

        if (!propertyDefined) {
          addMessage(
            node,
            "Unknown property '" + getNodeName(node) + "'",
            rule.severity
          )
        }
      }
    },
    // Detects top-level identifiers, e.g. the object in
    // `object.property` or just `object`.
    Identifier: function (node, state, c) {
      var rule = getRule("UnknownIdentifier")
      if (!rule) return
      var type = infer.expressionType({ node: node, state: state })

      if (type.originNode != null || type.origin != null) {
        // The node is defined somewhere (could be this node),
        // regardless of whether or not the type is known.
      } else if (type.isEmpty()) {
        // The type of the identifier cannot be determined,
        // and the origin is unknown.
        addMessage(
          node,
          "Unknown identifier '" + getNodeName(node) + "'",
          rule.severity
        )
      } else {
        // Even though the origin node is unknown, the type is known.
        // This is typically the case for built-in identifiers (e.g. window or document).
      }
    },
    // Detects function calls.
    // `node.callee` is the expression (Identifier or MemberExpression)
    // the is called as a function.
    NewExpression: validateCallExpression,
    CallExpression: validateCallExpression,
    AssignmentExpression: function (node, state, c) {
      var rule = getRule("TypeMismatch")
      validateAssignement(node.left, node.right, rule, state)
    },
    ObjectExpression: function (node, state, c) {
      // validate properties of the object literal
      var rule = getRule("ObjectLiteral")
      if (!rule) return
      var actualType = node.objType
      var ctxType = infer.typeFromContext(file.ast, {
          node: node,
          state: state,
        }),
        expectedType = null
      if (ctxType instanceof infer.Obj) {
        expectedType = ctxType.getObjType()
      } else if (ctxType && ctxType.makeupType) {
        var objType = ctxType.makeupType()
        if (objType && objType.getObjType()) {
          expectedType = objType.getObjType()
        }
      }
      if (expectedType && expectedType != actualType) {
        // expected type is known. Ex: config object of RequireJS
        checkPropsInObject(node, expectedType, actualType, rule)
      }
    },
    ArrayExpression: function (node, state, c) {
      // validate elements of the Arrray
      var rule = getRule("Array")
      if (!rule) return
      //var actualType = infer.expressionType({node: node, state: state});
      var ctxType = infer.typeFromContext(file.ast, {
          node: node,
          state: state,
        }),
        expectedType = getArrType(ctxType)
      if (expectedType /*&& expectedType != actualType*/) {
        // expected type is known. Ex: config object of RequireJS
        checkItemInArray(node, expectedType, state, rule)
      }
    },
    ImportDeclaration: function (node, state, c) {
      // Validate ES6 modules from + specifiers
      var rule = getRule("ES6Modules")
      if (!rule) return
      var me = infer.cx().parent.mod.modules
      if (!me) return // tern plugin modules.js is not loaded
      var source = node.source
      if (!source) return
      // Validate ES6 modules "from"
      var modType = me.getModType(source)
      if (!modType) {
        addMessage(
          source,
          "Invalid modules from '" + source.value + "'",
          rule.severity
        )
        return
      }
      // Validate ES6 modules "specifiers"
      var specifiers = node.specifiers,
        specifier
      if (!specifiers) return
      for (var i = 0; i < specifiers.length; i++) {
        var specifier = specifiers[i],
          imported = specifier.imported
        if (imported) {
          var name = imported.name
          if (!modType.hasProp(name))
            addMessage(
              imported,
              "Invalid modules specifier '" + getNodeName(imported) + "'",
              rule.severity
            )
        }
      }
    },
  }

  return visitors
}

// Adapted from infer.searchVisitor.
// Record the scope and pass it through in the state.
// VariableDeclaration in infer.searchVisitor breaks things for us.
var scopeVisitor = walk.make({
  Function: function (node, _st, c) {
    var scope = node.scope
    if (node.id) c(node.id, scope)
    for (var i = 0; i < node.params.length; ++i) c(node.params[i], scope)
    c(node.body, scope, "ScopeBody")
  },
  Statement: function (node, st, c) {
    c(node, node.scope || st)
  },
})

// Validate one file

export function validateFile(server, query, file) {
  try {
    var messages = [],
      ast = file.ast,
      state = file.scope
    var visitors = makeVisitors(server, query, file, messages)
    walk.simple(ast, visitors, infer.searchVisitor, state)
    return { messages: messages }
  } catch (e) {
    console.error(e.stack)
    return { messages: [] }
  }
}

export function registerTernLinter() {
  tern.defineQueryType("lint", {
    takesFile: true,
    run: function (server, query, file) {
      return validateFile(server, query, file)
    },
  })

  tern.defineQueryType("lint-full", {
    run: function (server, query) {
      return validateFiles(server, query)
    },
  })

  tern.registerPlugin("lint", function (server, options) {
    server._lint = {
      rules: getRules(options),
    }
    return {
      passes: {},
      loadFirst: true,
    }
  })
}

// Validate the whole files of the server

export function validateFiles(server, query) {
  try {
    var messages = [],
      files = server.files,
      groupByFiles = query.groupByFiles == true
    for (var i = 0; i < files.length; ++i) {
      var messagesFile = groupByFiles ? [] : messages,
        file = files[i],
        ast = file.ast,
        state = file.scope
      var visitors = makeVisitors(server, query, file, messagesFile)
      walk.simple(ast, visitors, infer.searchVisitor, state)
      if (groupByFiles)
        messages.push({ file: file.name, messages: messagesFile })
    }
    return { messages: messages }
  } catch (e) {
    console.error(e.stack)
    return { messages: [] }
  }
}

var lints = Object.create(null)

var getLint = (tern.getLint = function (name) {
  if (!name) return null
  return lints[name]
})

function getRules(options) {
  var rules = {}
  for (var ruleName in defaultRules) {
    if (
      options &&
      options.rules &&
      options.rules[ruleName] &&
      options.rules[ruleName].severity
    ) {
      if (options.rules[ruleName].severity != "none")
        rules[ruleName] = options.rules[ruleName]
    } else {
      rules[ruleName] = defaultRules[ruleName]
    }
  }
  return rules
}

function getRule(ruleName) {
  const cx = infer.cx()
  const server = cx.parent
  const rules =
    server && server._lint && server._lint.rules
      ? server._lint.rules
      : defaultRules
  return rules[ruleName]
}
