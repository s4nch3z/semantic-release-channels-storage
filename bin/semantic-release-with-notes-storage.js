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
    apply: function(target, thisArg, argumentsList) {
      if (argumentsList.length > 1 && argumentsList[0] === 'git') {
        if ((argumentsList[1].length === 4 && argumentsList[1][0] === 'fetch' && argumentsList[1][3].startsWith('+refs/notes/'))
        || (argumentsList[1].length === 5 && argumentsList[1][0] === 'fetch' && argumentsList[1][4].startsWith('+refs/notes/'))) {
          logger.debug('Handling fetchNotes with noop');
          logger.debug(argumentsList[1]);
        }

        if (argumentsList[1].length === 3 && argumentsList[1][0] === 'push' && argumentsList[1][2].startsWith('refs/notes/')) {
          logger.debug('Handling pushNotes');
          logger.debug(argumentsList[1]);
        }

        if (argumentsList[1].length === 8 && argumentsList[1][0] === 'notes' && argumentsList[1][3] === 'add') {
          logger.debug('Handling addNote');
          logger.debug(argumentsList[1]);
        }

        if (argumentsList[1].length === 5 && argumentsList[1][0] === 'notes' && argumentsList[1][3] === 'show') {
          logger.debug('Handling getNote');
          logger.debug(argumentsList[1]);
        }

      }

      let result = target.apply(thisArg, argumentsList);
      // logger.debug(`Function: execa\nArgs: ${JSON.stringify(argumentsList, null, 2)}\nReturn: ${JSON.stringify(result, null, 2)}`);
      return result;
    }
  };
  return new Proxy(exports, handler);
})

// Continue with semantic-release
eval(fs.readFileSync(filePath).toString());