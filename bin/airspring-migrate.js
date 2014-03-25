#!/usr/bin/env node
var AirspringMigration = require('../').AirspringMigration,
    path = require('path'),
    Logger = require('../lib/logger');

// default logger
var logger = new Logger();

// option defaults
var options = { silent: false },
    configFileName = 'default-config.js',
    cwd = process.cwd(),
    dbOverride = null;

// usage information message
var usage = [
    '',
    '  Usage: airspring-migrate [options] [command]',
    '',
    '  Options:',
    '',
    '     -c, --chdir <path>          change the working directory',
    '     -cfg, --config <path>       DB config file name',
    '     -sc    --scripts <path>    change the path to the script folder',
    '     -F    -FORCE    clears the migration collection before running migrations up forcing all migrations to run again',
    '     -db    --database   overrides the value in the config file for database name',
    '',
    '  Commands:',
    '',
    '     down   [name]    migrate down till given migration',
    '     up     [name]    migrate up till given migration (the default command)',
    '     create [title]   create a new migration file with optional [title]',
    ''
].join('\n');

// parse arguments
var arg,
    arguments = [],
    command = null,
    force = false;

var args = process.argv.slice(2);
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
            options.cwd = requiredArg();
            break;
        case '-cfg':
        case '--config':
            configFileName = requiredArg();
            break;
        case '-s':
        case '--silent':
            options.silent = true;
            break;
        case '-sc':
        case '--scripts':
            options.scripts = requiredArg();
            break;
        case 'db':
        case '--database':
            dbOverride = requiredArg();
            break;
        case '-F':
        case '--FORCE':
            force = true;
            break;
        default:
            if (command) {
                arguments.push(arg);
            } else {
                command = arg;
            }
    }
}

// Initialize the configuration object
options.config = new (require((options.cwd || process.cwd()) + path.sep + configFileName))();
// override db
if (dbOverride) options.config.db = dbOverride;

var migrations = new AirspringMigration(options);
migrations.run(command, arguments, force, function (err) {
    if (err)  return abort(err);
    // success
    process.exit();
});

// --- Helper functions ---

// pulls the next arg off the stack (aborts if missing)
function requiredArg() {
    if (args.length) return args.shift();
    abort(arg + ' requires an argument');
}
// logs the error and aborts the process
function abort(msg) {
    logger.log('error', msg, true);
    process.exit(1);
}

// --- End Helper functions ---