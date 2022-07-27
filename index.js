const getLogger = require('./lib/get-logger');
const logger = getLogger({stdout: process.stdout, stderr: process.stderr});

async function add () {
  logger.info("Storage add");
}

async function get () {
  logger.info("Storage get");
}

async function push () {
  logger.info("Storage push");
}

module.exports = {
  add,
  get,
  push
};