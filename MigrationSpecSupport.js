/**
 * DatabaseMigrationSpec-Support.js
 * Spreads out some of the supporting functions used in the DataBaseMigrationSpec to keep the spec purely tests
 */
var fs = require('fs'),
    _ = require('underscore');
    exec = require('child_process').exec;

module.exports = DataBaseMigrationSpecSupport;

function DataBaseMigrationSpecSupport(scriptsFolder, runCommand) {
    this.scriptsFolder = scriptsFolder;
    this.runCommand = runCommand;
}

var timeStampPattern = '^(\\d{14}[-])';

_.extend(DataBaseMigrationSpecSupport.prototype, {
    // Remove any files created by a spec test and restore the database to it's initial pre-spec state
    dbFSCleanUp: function (options) {
        this.resetFileSystem(options.rootPath);
        var self = this;
        this.resetDataBase(options.dbName, function (error) {
            if (error) return complete(error);
            if (typeof options.dumpPath === 'string') {
                self.restoreDataBase(options.dbName, options.dumpPath, options.complete);
            } else {
                options.complete();
            }
        });

    },
    // Takes a path and regex expression and returns files matching the patter at the specified path
    getFiles: function (path, regex) {
        var files  = fs.readdirSync(path);

        if (!(regex instanceof RegExp)) regex = new RegExp(regex, 'i');

        var matches = files.filter(function (fileName) {
            return regex.test(fileName);
        });

        return matches;
    },
    // Checks if a files matching the specified regex pattern exists at the specified path
    fileExists: function (path, regex) {
        var matches = this.getFiles(path, regex);
        return matches && matches.length > 0;
    },
    resetFileSystem: function (rootPath) {
        // Reset file system
        var files = this.getFiles(rootPath + this.scriptsFolder, /^(\d{14}[-]).*\.js/i);
        var self = this;
        _.each(files, function (element) {
            fs.unlink(rootPath + self.scriptsFolder + '/' + element, function(err){
                if (err) {
                    console.log('Error removing ./' + self.scriptsFolder + '/' + element + ': ' + err);
                }
            });
        });
    },
    resetDataBase: function (dbName, complete) {
        exec('mongo ' + dbName + ' --eval "db.dropDatabase()"', function (error, stdout, stderr) {
            complete(error);
        });
    },
    restoreDataBase: function (dbName, dumpPath, complete) {
        exec('mongorestore --drop --db ' + dbName + ' ' + dumpPath, function (error, stdout, stderr) {
            if (error) console.error(error);
            if (_.isFunction(complete)) complete();
        });
    },
    fetchTemplate: function (templateName) {
        return fs.readFileSync('./spec-migration-scripts/' + templateName + '.js', 'utf8');
    },
    writeMigrationFile: function (migrationName, migrationScript, callback) {
        var testFile = this.getFiles('./' + this.scriptsFolder, timeStampPattern + migrationName + '.js')[0];
        fs.writeFile('./' + this.scriptsFolder + '/' + testFile, migrationScript, function(err){
            expect(err).toBeFalsy();
            callback();
        });
    },
    // options { migrationName, callback, [migrationScript] }
    runCreate: function (options) {
        var self = this;
        exec(self.runCommand + ' create ' + options.migrationName, function (error, stdout, stderr) {
            expect(error).toBeFalsy();

            // Check that the create command produced a file
            expect(self.fileExists('./' + self.scriptsFolder, timeStampPattern + options.migrationName + '.js')).toBe(true);

            var testFile = self.getFiles('./' + self.scriptsFolder, timeStampPattern + options.migrationName + '.js')[0],
                path = './' + self.scriptsFolder + '/' + testFile;

            fs.readFile(path, 'utf8', function(err, data) {
                expect(err).toBeFalsy();

                // Check that the file created matches the template
                expect(data).toBe(self.fetchTemplate('template'));

                if (typeof options.migrationScript	=== 'undefined') {
                    options.callback();
                } else {
                    self.writeMigrationFile(options.migrationName, options.migrationScript, options.callback);
                }
            });
        });
    },
    // expose a test for the migration contoller storage creation functionality so that users implementing their own drivers can use this from the context of there jasmine tests
    testMigrationControllerStorageCreation: function (storage, done) {
        storage.hasMigrationStorage(function (err, exists) {
            expect(err).toBeFalsy();
            expect(exists).toBe(false);

            storage.createMigrationStorage(function (err, collection) {
                expect(err).toBeFalsy();

                storage.hasMigrationStorage(function (err, exists) {
                    expect(err).toBeFalsy();
                    expect(exists).toBe(true);
                    done();
                });

            });
        });
    },
    testMigrationControllerCanAddAndRemoveMigrations: function (storage, done) {
        var removeMigrations = function (storage, complete) {
            storage.getFirstMigrationEntry(function(err, object) {
                expect(err).toBeFalsy();

                if (object !== null) {
                    var m = object;
                    storage.removeMigrationEntry(m, function(err, object){
                        expect(err).toBeFalsy();

                        removeMigrations(storage, complete);
                    });
                } else {
                    storage.getAllMigrationEntries(function (err, migrations) {
                        expect(err).toBeFalsy();
                        expect(migrations.length).toBe(0);
                        complete();
                    });
                }

            });
        };

        var addMigrations = function (i, storage, complete) {
            var cur = Date.now();
            var migration = {
                num: cur,
                title: cur  + '-' + 'test' + i + '.js'
            };

            storage.addMigrationEntry(migration, function(err, object) {
                expect(err).toBeFalsy();

                setTimeout(function () {
                    storage.getFirstMigrationEntry(function (err, m) {
                        expect(err).toBeFalsy();
                        expect(m).toBeTruthy();
                        expect(m.title.split('-')[1]).toBe('test0');

                        storage.getLastMigrationEntry(function(err, m) {
                            expect(err).toBeFalsy();
                            expect(m).toBeTruthy();
                            expect(m.title).toBe(cur  + '-' + 'test' + i);

                            if (i < 4) {
                                addMigrations(++i, storage, complete);
                            } else {
                                storage.getAllMigrationEntries(function (err, migrations) {
                                    expect(err).toBeFalsy();
                                    expect(migrations.length).toBe(5);
                                    complete();
                                });
                            }

                        });
                    });
                }, 100);
            });
        };

        addMigrations(0, storage, function () {
            removeMigrations(storage, done);
        });
    }
});