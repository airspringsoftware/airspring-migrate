var migrate = require('./lib/migrate'),
    path = require('path'),
    mongojs = require('mongojs'),
    fs = require('fs'),
    _ = require('Underscore'),
    MigrationSpecSupport = require('./MigrationSpecSupport'),
    self = this;

// Extend Db to give it an exists function so we can determine if a collection exists
_.extend(mongojs.Database.prototype, {
    exists: function (collectionName, complete) {
        this.getCollectionNames(function(err, names){
            if (typeof complete === "function") complete(err, _.contains(names, collectionName));
        });
    }
});

/**
 * Current working directory.
 */
var previousWorkingDirectory = process.cwd(),
    cwd = process.cwd(),
    migrationScriptFolder = 'scripts',
    scriptsPath = cwd + path.sep + migrationScriptFolder + path.sep,
    migrationFilePattern = /^\d+.*\.js$/;


var defaultDriverFileName = 'driver.js';

/**
 * Default migration template.
 */
var defaultTemplate = '';

/**
 * Log a keyed message.
 */
var log = function (key, msg) {
    console.log('  \033[90m%s :\033[0m \033[36m%s\033[0m', key, msg);
};


/**
 * Slugify the given `str`.
 */
function slugify(str) {
    return str.replace(/\s+/g, '-');
}

function runAirSpringMigrate(options, complete) {
    if (typeof options === 'undefined') options = { args: [] };

    var config = options.config, // Convert the database config file to an object
        driver = config.driver,
        template = typeof config.template === 'undefined' ? defaultTemplate : config.template;

    if (typeof options.cwd !== 'undefined') chdir(options.cwd);
    if (_.isFunction(config.log)) log = config.log; // override the log function

    if (typeof options.scripts !== 'undefined') scriptsPath = options.scripts;
    if (scriptsPath.substr(scriptsPath.length-1) !== path.sep) scriptsPath += path.sep;
    
    /**
     * Load migrations.
     * @param {String} direction
     * @param {Number} lastMigrationNum
     * @param {Number} migrateTo
     */
    function migrations(direction, lastMigrationNum, migrateTo) {
        var isDirectionUp = direction === 'up',
            hasMigrateTo = !!migrateTo,
            migrateToNum = hasMigrateTo ? parseInt(migrateTo, 10) : undefined,
            migrateToFound = !hasMigrateTo;

        var migrationsToRun = fs.readdirSync(scriptsPath)
            .filter(function (file) {
                var formatCorrect = file.match(migrationFilePattern),
                    migrationNum = formatCorrect && getMigrationNum(file),
                    isRunnable = formatCorrect && isDirectionUp ? migrationNum > lastMigrationNum : migrationNum <= lastMigrationNum;

                if (!formatCorrect) {
                    log('info', '"' + file + '" ignored. Does not match migration naming schema');
                }

                return formatCorrect && isRunnable;
            }).sort(function (a, b) {
                var aMigrationNum = getMigrationNum(a),
                    bMigrationNum = getMigrationNum(b);

                if (aMigrationNum > bMigrationNum) {
                    return isDirectionUp ? 1 : -1;
                }
                if (aMigrationNum < bMigrationNum) {
                    return isDirectionUp ? -1 : 1;
                }

                return 0;
            }).filter(function(file){
                var formatCorrect = file.match(/^\d+.*\.js$/),
                    migrationNum = formatCorrect && getMigrationNum(file),
                    isRunnable = formatCorrect && isDirectionUp ? migrationNum > lastMigrationNum : migrationNum <= lastMigrationNum;

                if (hasMigrateTo) {
                    if (migrateToNum === migrationNum) {
                        migrateToFound = true;
                    }

                    if (isDirectionUp) {
                        isRunnable = isRunnable && migrateToNum >= migrationNum;
                    } else {
                        isRunnable = isRunnable && migrateToNum <= migrationNum;
                    }
                }

                return formatCorrect && isRunnable;
            }).map(function(file){
                return scriptsPath + file;
            });

        if (!migrateToFound) {
            if (migrateToNum === lastMigrationNum) return abort('migration `' + migrateTo + '` has already been ran!');
            return abort('migration `'+ migrateTo + '` not found!', complete);
        }

        return migrationsToRun;
    }

    // create ./migrations

    try {
        fs.mkdirSync(scriptsPath, 0774);
    } catch (err) {
        // ignore
    }

    // commands

    var commands = {
        /**
         * up
         */
        up: function(migrateTo){
            performMigration('up', migrateTo);
        },

        /**
         * down
         */
        down: function(migrateTo){
            performMigration('down', migrateTo);
        },

        /**
         * create [title]
         */
        create: function(){
            var currDate = new Date(),
                title = slugify([].slice.call(arguments).join(' '));
            var dateString = currDate.getFullYear() +
                padString('00', currDate.getDate()) +
                padString('00', (currDate.getMonth() + 1)) +
                padString('00', currDate.getHours()) +
                padString('00', currDate.getMinutes()) +
                padString('00', currDate.getSeconds()) +
                padString('000', currDate.getMilliseconds());

            title = title ? dateString + '-' + title : dateString;
            create(title);
        }
    };

    /**
     * Create a migration with the given `name`.
     *
     * @param {String} name
     */
    function create(name) {
        var fullPath = scriptsPath + name + '.js';
        log('create', fullPath);
        fs.writeFileSync(fullPath, template);
        if (_.isFunction(complete)) complete();
    }

    /**
     * Perform a migration in the given `direction`.
     *
     * @param {String} direction
     */
    function performMigration(direction, migrateTo) {

        driver.getConnection(config, function (err, results) {
            if (err) {
                //console.error('Error connecting to database');
                return abort(err, complete);
            }

            var migrationStorage = results.migrationStorageController;
            migrationStorage.getLastMigrationEntry(function (err, migrationsRun) {
                if (err) {
                    // console.error('Error querying migration collection', err);
                    return abort(err, complete);
                }

                var lastMigration = migrationsRun,
                    lastMigrationNum = lastMigration ? lastMigration.num : 0;
                migrate({
                    migrationScriptResources: results.resources, // Name this better
                    migrationStorageController: results.migrationStorageController,
                    complete: complete
                });

                migrations(direction, lastMigrationNum, migrateTo).forEach(function(scriptPath){
                    var mod = require(path.resolve(cwd, scriptPath)); // Import the migration file
                    var fileName = path.basename(scriptPath);

                    migrate({
                        num: getMigrationNum(fileName),
                        title: fileName,
                        up: mod.up,
                        down: mod.down
                    });
                });

                //Revert working directory to previous state
                process.chdir(previousWorkingDirectory);

                if (!_.isFunction(complete)) {
                    complete = function(err) {
                        if (err) {
                            log('Error', err, true);
                            throw new Error(err);
                        }
                    };
                }
                var set = migrate({ complete: complete });

                set.on('migration', function(migration, direction){
                    log(direction, migration.title);
                });

                set.on('save', function(){
                    log('migration', 'complete');
                    if (_.isFunction(complete)) complete();
                });

                set[direction](null, lastMigrationNum);
            });
        });
    }

    // invoke command
    var command = options.command || 'up';
    if (!_.has(commands, command)) {
        return abort('unknown command "' + command + '"', complete);
    }
    command = commands[command];
    command.apply(this, options.args);
}

/**
 * abort with a message
 * @param msg
 */
function abort(msg, complete) {
    if (_.isFunction(complete)) complete(msg);
    //console.error('  %s', msg);
    //process.exit(1);
}

function chdir(dir) {
    process.chdir(cwd = dir);
}

function getMigrationNum (scriptName) {
    return parseInt(scriptName.match(/^(\d+)/)[0], 10);
}

function padString(pad, str) {
    str = str.toString(); // cast to string
    return pad.substring(0, pad.length - str.length) + str;
}

module.exports = {
    run: runAirSpringMigrate,
    Driver: require(__dirname + '/driver.js'),
    MigrationStorageController: require(__dirname + '/MigrationStorageController.js'),
    Configuration: require(__dirname + '/default-config.js'),
    mongojs: mongojs,
    MigrationSpecSupport: MigrationSpecSupport
};