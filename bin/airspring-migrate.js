#!/usr/bin/env node
var migrate = require('../'),
    path = require('path');

/**
 * Arguments.
 */
var args = process.argv.slice(2);

/**
 * Option defaults.
 */
var options = { args: [] },
    configFileName = 'default-config.js',
    dbProperty = 'connectionOptions',
    cwd = process.cwd();

function setConfigFilename(filename) {
    configFileName = filename;
}

function setConfigFileProperty(propertyName) {
    dbProperty = propertyName;
}

function setWorkingDirectory(dir) {
    options.cwd = dir;
}

/**
 * Usage information.
 */
var usage = [
    ''
    , '  Usage: airspring-migrate [options] [command]'
    , ''
    , '  Options:'
    , ''
    , '     -c, --chdir <path>    		change the working directory'
    , '     -cfg, --config <path> 		DB config file name'
    , '     -dbn, --dbPropName <string> Property name for database connection in config file'
    , ''
    , '  Commands:'
    , ''
    , '     down   [name]    migrate down till given migration'
    , '     up     [name]    migrate up till given migration (the default command)'
    , '     create [title]   create a new migration file with optional [title]'
    , ''
].join('\n');


/**
 * require an argument
 * @returns {*}
 */
function required() {
    if (args.length) return args.shift();
    abort(arg + ' requires an argument');
}

/**
 * abort with a message
 * @param msg
 */
function abort(msg) {
    console.error('  %s', msg);
    process.exit(1);
}


var runMongoMigrateIdx = args.indexOf('--runMongoMigrate');
if (runMongoMigrateIdx > -1) args.splice(runMongoMigrateIdx, 1);

// parse arguments
var arg;
while (args.length) {
    arg = args.shift();
    switch (arg) {
        case '-h':
        case '--help':
        case 'help':
            console.log(usage);
            process.exit();
            break;
        case '-c':
        case '--chdir':
            setWorkingDirectory(required());
            break;
        case '-cfg':
        case '--config':
            setConfigFilename(required());
            break;
        case '-dbn':
        case '--dbPropName':
            setConfigFileProperty(required());
            break;
        default:
            if (options.command) {
                options.args.push(arg);
            } else {
                options.command = arg;
            }
    }
}

options.config = new (require((options.cwd || process.cwd()) + path.sep + configFileName))();
options.dbProperty = dbProperty;

migrate.run(options);