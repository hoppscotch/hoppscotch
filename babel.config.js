function isBabelLoader(caller) {
  return caller && caller.name === "babel-loader"
}

module.exports = function (api) {
  if (api.env("test") && !api.caller(isBabelLoader)) {
    return {
      plugins: [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-nullish-coalescing-operator",
        "@babel/plugin-proposal-optional-chaining",
      ],
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              node: "current",
            },
          },
        ],
      ],
    }
  }
  return {}
}
