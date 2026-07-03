let configLevel

switch (process.env.APP_ENV) {
  case 'production':
    configLevel = 'prod'
    break
  case 'stage':
    configLevel = 'stage'
    break
  case 'local':
    configLevel = 'loc'
    break
  case 'development':
  default:
    configLevel = 'dev'
    break
}

const config = require(`./app.${configLevel}.config.json`)

config.level = configLevel

module.exports = config
