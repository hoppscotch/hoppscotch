// https://github.com/antfu/unplugin-vue2-script-setup/issues/8

const { raw } = require("unplugin-vue2-script-setup")

const transform = raw().transform

module.exports = {
  process(source, filename, ...args) {
    const transformed = transform(source, filename)
    const code = transformed ? transformed.code : source
    return require("vue-jest").process.call(this, code, filename, ...args)
  },
}
