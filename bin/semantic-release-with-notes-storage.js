#!/usr/bin/env node

var fs = require('fs');
const path = require('path');

const binName = 'semantic-release-with-notes-storage';
let dirOfSRModule;
let filePath;
let fileDir;

// Validate setup
try {
  dirOfSRModule = path.dirname(require.resolve('semantic-release'));
  filePath = `${dirOfSRModule}/bin/semantic-release.js`;
  if (fs.existsSync(filePath)) {
    console.debug(`[${binName}]: semantic-release executable found at ${filePath}`);
    fileDir = path.dirname(filePath);
  } else {
    console.error(`[${binName}]: semantic-release executable not found at ${filePath}.`);
    process.exit(1);
  }
} catch(err) {
  console.error(`[${binName}]: npm with installed dependencies for this project is required. No semantic-release dependency found.`);
  console.error(err);
  process.exit(1);
}

// Emulate require paths
require.main.path = fileDir;
require.main.filename = filePath;
require.main.paths.shift();
require.main.paths.unshift(`${dirOfSRModule}/node_modules`);
require.main.paths.unshift(`${dirOfSRModule}/bin/node_modules`);

// Inject interceptors and wrap into proxies
const ritm = require('require-in-the-middle');
const storage = require('../../../.');
const getLogger = require('../lib/get-logger');
const logger = getLogger({stdout: process.stdout, stderr: process.stderr});
logger.info('Using git for notes storage');
ritm(["execa"], function (exports, name, basedir) {
  const version = require(path.join(basedir, 'package.json')).version
  logger.debug('Intercepting %s@%s', name, version);
  let handler = {
    get(target, propKey, receiver) {
        const origMethod = target[propKey];
        return function (...args) {
            let result = origMethod.apply(this, args);
            logger.debug(`Function: ${propKey}\nArgs: ${JSON.stringify(args, null, 2)}\nReturn: ${JSON.stringify(result, null, 2)}`);
            return result;
        };
    }
  };
  return new Proxy(exports, handler);
})

// Continue with semantic-release
eval(fs.readFileSync(filePath).toString());