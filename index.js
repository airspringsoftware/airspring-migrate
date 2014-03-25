// resources
var Logger = require('./lib/logger'),
    MigrationModel = require('./lib/MigrationModel'),
    MigrationSet = require('./lib/MigrationSet')
    path = require('path'),
    mongojs = require('mongojs'),
    fs = require('fs'),
    _ = require('underscore'),
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

// exports
module.exports = {
    AirspringMigration: AirspringMigration,
    Driver: require(__dirname + '/driver.js'),
    MigrationStorageController: require(__dirname + '/MigrationStorageController.js'),
    Configuration: require(__dirname + '/default-config.js'),
    mongojs: mongojs,
    MigrationSpecSupport: MigrationSpecSupport
};

var previousWorkingDirectory = process.cwd(),
    cwd = process.cwd(),
    migrationScriptFolder = 'scripts',
    // default migration template
    defaultTemplate = '',
    migrationFilePattern = /^\d+.*\.js$/;

function AirspringMigration (options) {
    if (typeof options === 'undefined') options = { args: [] };

    var config = options.config;
    this.driver = config.driver;

    this.template = typeof config.template === 'undefined' ? defaultTemplate : config.template;

    if (typeof options.cwd !== 'undefined') chdir(options.cwd);

    if (config.logger) this.logger = config.logger; // override the logger object
    else this.logger = new Logger();

    this.logger.silent = options.silent;

    this.scriptsPath = cwd + path.sep + migrationScriptFolder + path.sep;

    if (typeof options.scripts !== 'undefined') this.scriptsPath = options.scripts;

    // make sure script path ends in path separator
    if (this.scriptsPath.substr(this.scriptsPath.length-1) !== path.sep) this.scriptsPath += path.sep;

    this.config = config;
}

_.extend(AirspringMigration.prototype, {
    /**
     * abort with a message
     * @param msg
     */
    abort: function (msg, complete) {
        if (_.isFunction(complete)) return complete(msg);
        this.logger.log('error', msg, true);
    },
    run: function (down, force, migrateTo, complete) {
        // allow migrteTo to be optional
        if (_.isFunction(migrateTo)) {
            complete = migrateTo;
            migrateTo = null;
        }

        var self = this;
        var performMigration = _.bind(_performMigration, this);

        // create scripts folder
        try { fs.mkdirSync(this.scriptsPath, 0774); } catch (err) {}

        if (down) {
            performMigration('down', migrateTo, complete);
        } else {
            if (force) {
                self.clearMigrations(function(err) {
                    if (err) return self.abort(err);
                    performMigration('up', migrateTo, complete);
                });
            } else {
                performMigration('up', migrateTo, complete);
            }
        }
    },
    /**
     * Create a migration with the given `name`.
     *
     * @param {String} name
     */
    createScript: function (title) {
        var currDate = new Date(),
            title = slugify([].slice.call(arguments).join(' '));
        var dateString = currDate.getFullYear() +
            padString('00', (currDate.getMonth() + 1)) +
            padString('00', currDate.getDate()) +
            padString('00', currDate.getHours()) +
            padString('00', currDate.getMinutes()) +
            padString('00', currDate.getSeconds());

        title = title ? dateString + '-' + title : dateString;

        var fullPath = this.scriptsPath + title + '.js';
        this.logger.log('create', fullPath);
        fs.writeFileSync(fullPath, this.template);
    },
    clearMigrations: function (complete) {
        var self = this;
        var _complete = function(err) {
            if (_.isFunction(complete)) complete(err);
        };

        this.logger.log('clear', 'migrations collection');
        this.getConnection(function (err, connectionResources) {
            if (err) return _complete(err);

            var migrationStorage = connectionResources.migrationStorageController;
            self.getAllMigrationStorageEntries(function (collection, err){
                if (err) return _complete(err);
                if (collection.length <= 0) return _complete();

                var migrationRemoved = _.after(collection.length, function() {
                    _complete();
                });

                _.each(collection, function (m) {
                    self.logger.log('remove', 'migration ' + m.title);
                    migrationStorage.removeMigrationEntry(m, function() {
                        migrationRemoved();
                    });
                });
            });
        })
    },
    getMigrationStorageController: function (complete) {
        if (!_.isFunction(complete)) return;
        if (this.migrationStorageController) return complete(this.migrationStorageController);
        var self = this;
        this.getConnection(function (connection, err) {
            if (err) return complete(null, err);

            self.migrationStorageController = connection.migrationStorageController;
            complete(self.migrationStorageController);
        });
    },
    getConnection: function (complete) {
        if (this.connectionResources) return complete(this.connectionResources);

        var self = this;
        this.driver.getConnection(this.config, function (err, results) {
                if (err) return complete(null, err);
                self.connectionResources = results;
                complete(self.connectionResources);
        });
    },
    addMigrationStorageEntry: function (migration, complete) {
        if (!_.isFunction(complete)) return;
        this.getMigrationStorageController(function (controller, err) {
            if (err) return complete(null, err);

            controller.addMigrationEntry(migration, complete);
        });
    },
    getFirstMigrationStorageEntry: function (complete) {
        if (!_.isFunction(complete)) return;
        this.getMigrationStorageController(function (controller, err) {
            if (err) return complete(null, err);
            controller.getFirstMigrationEntry(complete);
        });
    },
    getLastMigrationStorageEntry: function (complete) {
        if (!_.isFunction(complete)) return;
        this.getMigrationStorageController(function (controller, err) {
            if (err) return complete(null, err);
            controller.getLastMigrationEntry(complete);
        });
    },
    /**
     * Returns a list of all migration that have currently been ran against this db
     *
     * @param complete callback function
     */
    getAllMigrationStorageEntries: function (complete) {
        var _complete = function (collection, err) {
            if (_.isFunction(complete)) complete(collection, err);
        };

        this.getConnection(function (results, err) {
            if (err) return _complete(null, err);

            var migrationStorage = results.migrationStorageController;
            migrationStorage.getAllMigrationEntries(function (err, collection) {
                _complete(collection, err);
            });
        });
    },
    getMigrationsToRun: function (direction, lastMigrationNum, migrateTo, processComplete) {
        var self = this;

        var isDirectionUp = direction === 'up',
            hasMigrateTo = !!migrateTo,
            migrateToNum = hasMigrateTo ? parseInt(migrateTo, 10) : undefined,
            migrateToFound = !hasMigrateTo;

        var migrationsToRun = fs.readdirSync(this.scriptsPath)
            .filter(function (file) {
                var formatCorrect = file.match(migrationFilePattern),
                    migrationNum = formatCorrect && getMigrationNum(file),
                    isRunnable = formatCorrect && isDirectionUp ? migrationNum > lastMigrationNum : migrationNum <= lastMigrationNum;

                if (!formatCorrect) {
                    self.logger.log('info', '"' + file + '" ignored. Does not match migration naming schema');
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
                return self.scriptsPath + file;
            });

        if (!migrateToFound) {
            if (migrateToNum === lastMigrationNum) throw new Error('migration `' + migrateTo + '` has already been ran!');
            throw new Error('migration `'+ migrateTo + '` not found!', processComplete);
        }

        return migrationsToRun;
    }
});

// --- Private Helper Functions ---
// Slugify the given `str`.
function slugify(str) {
    return str.replace(/\s+/g, '-');
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

/**
 * Perform a migration in the given `direction`.
 * (use with bind to set this context)
 *
 * @param {String} direction
 */
function _performMigration (direction, migrateTo, complete) {
    var self = this;

    this.getConnection(function (results, err) {
        if (err) return self.abort(err, complete);

        var migrationStorage = results.migrationStorageController,
            migrationSet = new MigrationSet(results.resources, results.migrationStorageController, self.logger, complete);

        migrationStorage.getLastMigrationEntry(function (err, migrationsRun) {
            if (err) return self.abort(err, complete);

            var lastMigration = migrationsRun,
                lastMigrationNum = lastMigration ? lastMigration.num : 0;

            try {
                var migrationList = self.getMigrationsToRun(direction, lastMigrationNum, migrateTo);
            } catch (ex) {
                return self.abort(ex, complete);
            }

            if (migrationList) {
                migrationList.forEach(function(scriptPath){
                    var mod = require(path.resolve(cwd, scriptPath)), // Import the migration file
                        fileName = path.basename(scriptPath); // resolve the file name of the migration

                    migrationSet.migrations.push(new MigrationModel(fileName, mod.up, mod.down, getMigrationNum(fileName)));
                });
            }
            //Revert working directory to previous state
            process.chdir(previousWorkingDirectory);

            if (!_.isFunction(complete)) {
                complete = function(err) {
                    if (err) {
                        self.logger.log('Error', err, true);
                        throw new Error(err);
                    }
                };
            }

            migrationSet.on('migration', function(migration, direction){
                self.logger.log(direction, migration.title);
            });

            migrationSet.on('save', function(){
                self.logger.log('migration', 'complete');

                if (_.isFunction(complete)) complete();
            });

            migrationSet[direction](null, lastMigrationNum);
        });
    });
}
// --- End Private Helper Function ---