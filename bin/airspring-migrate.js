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
    cwd = process.cwd(),
    silent = false;

/**
 * Usage information.
 */
var usage = [
    '',
    '  Usage: airspring-migrate [options] [command]',
    '',
    '  Options:',
    '',
    '     -c, --chdir <path>          change the working directory',
    '     -cfg, --config <path>       DB config file name',
    '     -sc    --scripts <path>    change the path to the script folder',
    '',
    '  Commands:',
    '',
    '     down   [name]    migrate down till given migration',
    '     up     [name]    migrate up till given migration (the default command)',
    '     create [title]   create a new migration file with optional [title]',
    ''
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
 * change the configuration filename that will be imported when running from the command line
 * @param filename
 */
function setConfigFilename(filename) {
    configFileName = filename;
}


/**
 * Change the current working directory under which the script is executed
 * @param dir
 */
function setWorkingDirectory(dir) {
    options.cwd = dir;
}

/**
 * Indicate that the log function should not produce output
 * @param value
 */
function setSilent(value) {
    silent = value;
}

/**
 * Function which outputs information about the state of the migration process
 * @param msg
 * @param error
 */
function log (key, msg, error) {
    if (!silent) {
        if (!error) {
            console.log('  \033[90m%s :\033[0m \033[36m%s\033[0m', key, msg);
        } else {
            console.error(key, msg);
        }
    }
}

/**
 * abort with a message
 * @param msg
 */
function abort(msg) {
    log('Error', msg, true);
    process.exit(1);
}

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
        case '-s':
        case '--silent':
            setSilent(true);
            break;
        case '-sc':
        case '--scripts':
            options.scripts = required();
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
options.log = log;

migrate.run(options, function (err) {
    if (err) {
        log('Error', err, true);
        process.exit(1);
    }

    process.exit();
});