var Migrations = require('../'),
    AirspringMigratiton = Migrations.AirspringMigration,
    MigrationStorageController = Migrations.MigrationStorageController,
    _ = require('underscore'),
    path = require('path'),
    Configuration = Migrations.Configuration,
    config = new Configuration(),
    dbPath = 'mongodb://' + config.host + ':' + config.port + '/' + config.db,
    exec = require('child_process').exec,
    mongojs = Migrations.mongojs,
    migrationFolderName = 'scripts',
    db = new mongojs(dbPath),
    storage = new MigrationStorageController(db),
    runCommand = 'node ../bin/airspring-migrate.js --config ../default-config.js ',
    scriptFolder = 'scripts',
    support = new Migrations.MigrationSpecSupport(scriptFolder, runCommand);

// Specify the default timeout
jasmine.getEnv().defaultTimeoutInterval = 80000;

/* ---- Begin Tests ---- */
describe('test MigrationStorageController', function () {
    afterEach(function (done) {
        runAfterEach(done);
    });

    it ('has the ability to check for and create a storage container', function (done) {
        support.testMigrationControllerStorageCreation(storage, done);
    });

    it ('ability to create and remove migrations from the storage container', function (done) {
        support.testMigrationControllerCanAddAndRemoveMigrations(storage, done);
    });
});

describe('test command line functionality,', function () {
    afterEach(function (done) {
        runAfterEach(done);
    });


    var testMigrations = ['test1', 'test2', 'test3'];
    var createMigrations = function (i, complete) {
        if (_.isFunction(i)) {
            complete = i;
            i = 0;
        }

        if (i < testMigrations.length) {
            var migrationName = testMigrations[i];
            support.runCreate({
                migrationName: migrationName,
                migrationScript: support.fetchTemplate(migrationName),
                callback: function () {
                    setTimeout(function () {
                        createMigrations(++i, complete);
                    }, 1000);
                }
            });
        } else {
            setTimeout(complete, 10);
        }
    };

    var checkInitialConditions = function (complete) {
        var afterExists = _.after(testMigrations.length, complete);
        _.each(testMigrations, function (migrationName) {
            db.exists(migrationName, function (err, exists) {
                expect(err).toBeFalsy();
                expect(exists).toBe(false);
                afterExists();
            });
        });
    };

    it("create generates a migration file according the specified template on the command line", function (done) {
        support.runCreate({ 'migrationName': 'template', 'callback': done });
    });

    it("migrations can be ran up and down using multiple migration files", function (done) {
        function testMigrateUp(complete) {
            // Run the migration
            exec(runCommand + ' up', function (error, stdout, stderr) {
                if (error) console.error(error);
                if (stderr) console.error(stderr);

                expect(error).toBeFalsy();
                expect(stderr).toBeFalsy();

                var afterExists = _.after(testMigrations.length, complete);
                _.each(testMigrations, function (migrationName) {
                    db.exists(migrationName, function (err, exists) {
                        expect(err).toBeFalsy();
                        expect(exists).toBe(true);
                        afterExists();
                    });
                });
            });
        }

        function testMigrateDown (complete) {
            exec(runCommand + ' down', function (error, stdout, stderr) {
                expect(error).toBeFalsy();
                expect(stderr).toBeFalsy();
                complete();
            });
        }

        createMigrations(function () {
            // Check the initial db conditions
            checkInitialConditions(function () {
                // Run the migrations up and test
                testMigrateUp(function () {
                    // Run the migrations down and test
                    testMigrateDown(done);
                });
            });
        });
    });

    it('migrations can be ran up to specific migration number', function (done) {
        createMigrations(function () {
            checkInitialConditions(function () {

                var testFile = support.getFiles('./' + scriptFolder, '^(\\d{14}[-])' + 'test2' + '.js')[0];
                var migrationMiddle = path.basename(testFile, '.js');

                exec(runCommand + ' up ' + migrationMiddle, function(error, stdout, stderr) {
                    expect(error).toBeFalsy();
                    expect(stderr).toBeFalsy();

                    storage.getAllMigrationEntries(function (err, migrations) {
                        expect(err).toBeFalsy();
                        expect(migrations.length).toBe(2);

                        db.exists('test1', function (err, exists) {
                            expect(err).toBeFalsy();
                            expect(exists).toBe(true);

                            db.exists('test2', function (err, exists) {
                                expect(err).toBeFalsy();
                                expect(exists).toBe(true);

                                db.exists('test3', function (err, exists) {
                                    expect(err).toBeFalsy();
                                    expect(exists).toBe(false);
                                    done();
                                });
                            });
                        });
                    });


                });



            });
        });
    });

    it('migrations can be forced to run up', function (done) {
        var cleanOut = /\[[0-9]+m/g;
        createMigrations(function () {
           exec(runCommand + ' up', function(error, stdout, stderr) {
               stdout = stdout.replace(cleanOut, '');
               expect(error).toBeFalsy();
               expect(stderr).toBeFalsy();
               expect(/up\s:[\D]*\d{14}\-test1.js/.test(stdout)).toBe(true);
               expect(/up\s:[\D]*\d{14}\-test2.js/.test(stdout)).toBe(true);
               expect(/up\s:[\D]*\d{14}\-test3.js/.test(stdout)).toBe(true);

               exec(runCommand + ' up --FORCE', function (err, stdout, stderr) {
                   stdout = stdout.replace(cleanOut, '');
                   expect(error).toBeFalsy();
                   expect(stderr).toBeFalsy();
                   expect(/up\s:[\D]*\d{14}\-test1.js/.test(stdout)).toBe(true);
                   expect(/up\s:[\D]*\d{14}\-test2.js/.test(stdout)).toBe(true);
                   expect(/up\s:[\D]*\d{14}\-test3.js/.test(stdout)).toBe(true);
                   done();
               });
           });
       });
    });
});


describe('test that migrations ran programmatically', function () {
    afterEach(function (done) {
        runAfterEach(done);
    });

    var migration = new AirspringMigratiton({
        config: config,
        silent: true
    });

    var createFourMigrations = function (complete) {
        var _runCreateModule = function (i) {
            if (i < 4) {
                migration.createScript('test' + i);
                expect(support.fileExists('./' + migrationFolderName, '^(\\d{14}[-])test'  + i +  '.js')).toBe(true);
                // delay one second between creates to ensure a new time stamp is created
                setTimeout(function () {
                    _runCreateModule(++i);
                }, 1000);
            } else {
                complete();
            }
        };

       _runCreateModule(0);
    };

    it ('can get the first and last migration', function (done) {
        createFourMigrations(function () {
            migration.run(false, false, function (err) {
                expect(err).toBeFalsy();
                // check that the last migration corresponds to the last one created
                migration.getLastMigrationStorageEntry(function (err, entry) {
                    expect(err).toBeFalsy();
                    expect(entry).toBeTruthy();
                    expect(entry.title.split('-')[1]).toBe('test3');

                    migration.getFirstMigrationStorageEntry(function (err, entry) {
                        expect(err).toBeFalsy();
                        expect(entry).toBeTruthy();
                        expect(entry.title.split('-')[1]).toBe('test0');

                        done();
                    });
                });
            });
        });
    });

    it ('can create a migration storage entry', function (done) {
        migration.addMigrationStorageEntry({ num: 20140107161818, title: '20140107161818-Created' }, function (err) {
            expect(err).toBeFalsy();
            migration.getLastMigrationStorageEntry(function (err, entry){
                expect(err).toBeFalsy();
                expect(entry).toBeTruthy();
                expect(entry.title).toBe('20140107161818-Created');

                done()
            });
        });
    });

    it('can run using and extended driver and config files', function (done) {
        createFourMigrations(function () {
            migration.run(false, false, function (err) {
                expect(err).toBeFalsy();
                migration.run(true, false, function (err) {
                    expect(err).toBeFalsy();
                    done();
                });
            });
        });
    });

});


function runAfterEach (done) {
    support.dbFSCleanUp({
        rootPath: './',
        dbName: config.db,
        resetFileSystem: true,
        complete: function (err, response) {
            if (err) console.error(err);
            done();
        }
    });
}