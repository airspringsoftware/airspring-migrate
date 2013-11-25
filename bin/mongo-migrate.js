#!/usr/bin/env node

var migrate = require('../');

/**
 * Arguments.
 */
var args = process.argv.slice(2);

/**
 * Option defaults.
 */
var options = { args: [] };

/**
 * Usage information.
 */
var usage = [
    ''
    , '  Usage: mongo-migrate [options] [command]'
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
            migrate.changeWorkingDirectory(required());
            break;
        case '-cfg':
        case '--config':
            migrate.setConfigFilename(required());
            break;
        case '-dbn':
        case '--dbPropName':
            migrate.setConfigFileProp(required());
            break;
        default:
            if (options.command) {
                options.args.push(arg);
            } else {
                options.command = arg;
            }
    }
}

migrate.run(options);