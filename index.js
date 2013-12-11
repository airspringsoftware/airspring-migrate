var migrate = require('./lib/migrate'),
    path = require('path'),
    join = path.join,
    fs = require('fs');

/**
 * Current working directory.
 */
var previousWorkingDirectory = process.cwd(),
    cwd = process.cwd();

var defaultDriverFileName = 'driver.js';

/**
 * Default migration template.
 */
var defaultTemplate = '';

/**
 * Log a keyed message.
 */
function log(key, msg) {
    console.log('  \033[90m%s :\033[0m \033[36m%s\033[0m', key, msg);
}

/**
 * Slugify the given `str`.
 */
function slugify(str) {
    return str.replace(/\s+/g, '-');
}

function runMongoMigrate(options, direction, migrationEnd) {
    var config = options.config, // Convert the database config file to an object
        dbOptions = config[options.dbProperty], // Get the database config options
        driver = config.driver,
        template = typeof config.template === 'undefined' ? defaultTemplate : config.template; // Get the database driver

    if (typeof options === 'undefined') options = { args: [] };

    if (typeof options.cwd !== 'undefined') chdir(options.cwd);

    if (typeof direction !== 'undefined') {
        options.command = direction;
    }

    if (typeof migrationEnd !== 'undefined') {
        options.args.push(migrationEnd);
    }

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

        var migrationsToRun = fs.readdirSync('migrations')
            .filter(function (file) {
                var formatCorrect = file.match(/^\d+.*\.js$/),
                    migrationNum = formatCorrect && parseInt(file.match(/^\d+/)[0], 10),
                    isRunnable = formatCorrect && isDirectionUp ? migrationNum > lastMigrationNum : migrationNum <= lastMigrationNum;

                if (!formatCorrect) {
                    console.log('"' + file + '" ignored. Does not match migration naming schema');
                }

                return formatCorrect && isRunnable;
            }).sort(function (a, b) {
                var aMigrationNum = parseInt(a.match(/^\d+/)[0], 10),
                    bMigrationNum = parseInt(b.match(/^\d+/)[0], 10);

                if (aMigrationNum > bMigrationNum) {
                    return isDirectionUp ? 1 : -1;
                }
                if (aMigrationNum < bMigrationNum) {
                    return isDirectionUp ? -1 : 1;
                }

                return 0;
            }).filter(function(file){
                var formatCorrect = file.match(/^\d+.*\.js$/),
                    migrationNum = formatCorrect && parseInt(file.match(/^\d+/)[0], 10),
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
                return 'migrations/' + file;
            });

        if (!migrateToFound) {
            if (migrateToNum === lastMigrationNum) return abort('migration `' + migrateTo + '` has already been ran!');
            return abort('migration `'+ migrateTo + '` not found!');
        }

        return migrationsToRun;
    }

    // create ./migrations

    try {
        fs.mkdirSync('migrations', 0774);
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
            var curr = Date.now(),
                title = slugify([].slice.call(arguments).join(' '));
            title = title ? curr + '-' + title : curr;
            create(title);
        }
    };

    /**
     * Create a migration with the given `name`.
     *
     * @param {String} name
     */
    function create(name) {
        var fullPath = 'migrations' + path.sep + name + '.js';
        log('create', join(cwd, fullPath));
        fs.writeFileSync(fullPath, template);
    }

    /**
     * Perform a migration in the given `direction`.
     *
     * @param {String} direction
     */
    function performMigration(direction, migrateTo) {

        driver.getConnection(dbOptions, function (err, results) {
            if (err) {
                console.error('Error connecting to database');
                process.exit(1);
            }

            var migrationStorage = results.migrationStorageController;
            //throw 'migrationStorage: ' + migrationStorage.constructor;
            migrationStorage.getLastMigrationEntry(function (err, migrationsRun) {
                if (err) {
                    console.error('Error querying migration collection', err);
                    process.exit(1);
                }

                var lastMigration = migrationsRun[0],
                    lastMigrationNum = lastMigration ? lastMigration.num : 0;

                migrate({
                    migrationTitle: 'migrations/.migrate',
                    db: results // Name this better
                });
                migrations(direction, lastMigrationNum, migrateTo).forEach(function(path){
                    var mod = require(cwd + '/' + path); // Import the migration file
                    migrate({
                        num: parseInt(path.split('/')[1].match(/^(\d+)/)[0], 10),
                        title: path,
                        up: mod.up,
                        down: mod.down});
                });

                //Revert working directory to previous state
                process.chdir(previousWorkingDirectory);

                var set = migrate();

                set.on('migration', function(migration, direction){
                    log(direction, migration.title);
                });

                set.on('save', function(){
                    log('migration', 'complete');
                    process.exit();
                });

                set[direction](null, lastMigrationNum);
            });
        });
    }

    // invoke command
    var command = options.command || 'up';
    if (!(command in commands)) abort('unknown command "' + command + '"');
    command = commands[command];
    command.apply(this, options.args);
}

/**
 * abort with a message
 * @param msg
 */
function abort(msg) {
    console.error('  %s', msg);
    process.exit(1);
}

function chdir(dir) {
    process.chdir(cwd = dir);
}

module.exports = {
    run: runMongoMigrate,
    Driver: require(__dirname + '/driver.js'),
    MigrationStorageController: require(__dirname + '/MigrationStorageController.js')
};