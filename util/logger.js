const basicPino = require('pino')
const basicPinoLogger = basicPino({ prettyPrint: true })
const expressPino = require('express-pino-logger')({
  logger: basicPinoLogger
})


const logger = expressPino.logger

//logger.error('hi') // prints pretty

module.exports = logger

