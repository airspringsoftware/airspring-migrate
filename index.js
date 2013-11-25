var migrate = require('./lib/migrate'),
    npm = require('npm'),
    path = require('path'),
    join = path.join,
    fs = require('fs');

/**
 * Current working directory.
 */
var previousWorkingDirectory = process.cwd(),
    cwd = process.cwd();

var configFileName = 'default-config.json',
    dbProperty = 'mongoAppDb';

/**
 * Migration template.
 */
var template = [
    , 'exports.up = function(dbContext, next){'
    , '    var db = dbContext.db, '
    , '        mongodb = dbContext.mongodb;'
    , ''
    , '    next();'
    , '};'
    , ''
    , 'exports.down = function(db, next){'
    , '    var db = dbContext.db, '
    , '        mongodb = dbContext.mongodb;'
    , ''
    , '    next();'
    , '};'
    , ''
].join('\n');

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
    if (typeof options === 'undefined') options = { args: [] };

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
                        isRunnable = isRunnable && migrateToNum < migrationNum;
                    }
                }

                return formatCorrect && isRunnable;
            }).map(function(file){
                return 'migrations/' + file;
            });

        if (!migrateToFound) {
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
        var db = require('./lib/db');
        db.getConnection(require(cwd + path.sep + configFileName)[dbProperty], function (err, db) {
            var migrationCollection = db.migrationCollection,
                dbConnection = db.connection;
            if (err) {
                console.error('Error connecting to database');
                process.exit(1);
            }

            migrationCollection.find({}).sort({num: -1}).limit(1).toArray(function (err, migrationsRun) {
                if (err) {
                    console.error('Error querying migration collection', err);
                    process.exit(1);
                }

                var lastMigration = migrationsRun[0],
                    lastMigrationNum = lastMigration ? lastMigration.num : 0;

                migrate({
                    migrationTitle: 'migrations/.migrate',
                    db: dbConnection,
                    migrationCollection: migrationCollection
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

function setConfigFilename(filename) {
    configFileName = filename;
}

function setConfigFileProperty(propertyName) {
    dbProperty = propertyName;
}

module.exports = {
    run: runMongoMigrate,
    changeWorkingDirectory: chdir,
    setConfigFilename: setConfigFilename,
    setConfigFileProp: setConfigFileProperty,
    join: join
};