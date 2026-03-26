const { baseConfig } = require('@tenora/eslint-config/base')
const { nextJsConfig } = require('@tenora/eslint-config/next')

module.exports = [...baseConfig, ...nextJsConfig]
