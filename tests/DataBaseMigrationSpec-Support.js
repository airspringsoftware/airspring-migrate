/**
 * DatabaseMigrationSpec-Support.js
 * Spreads out some of the supporting functions used in the DataBaseMigrationSpec to keep the spec purely tests
 */
/* Requirements */
var fs = require('fs'),
    _ = require('underscore'),
    exec = require('child_process').exec,
    scriptFolder = 'scripts',
    runCommand = 'node ../bin/airspring-migrate.js --config ../default-config.js',
    Migrations = require('../'),
    mongojs = Migrations.mongojs;

module.exports = function (dbPath) {
    var db = mongojs(dbPath);

    /* Takes a path and regex expression and returns files matching the patter at the specified path */
    var getFiles = function (path, regex) {
        var files  = fs.readdirSync(path);

        var matches = files.filter(function (fileName) {
            return new RegExp(regex, 'i').test(fileName);
        });

        return matches;
    };

    /* Checks if a files matching the specified regex pattern exists at the specified path */
    var fileExists = function (path, regex) {
        var matches = getFiles(path, regex);
        return matches && matches.length > 0;
    };

    var resetFileSystem = function () {
        // Reset file system
        var files = getFiles('./' + scriptFolder, '^(\\d{17}[-]).*\\.js');
        _.each(files, function(element, index, list){
            fs.unlink('./' + scriptFolder + '/' + element, function(err){
                if (err) {
                    console.log('Error removing ./' + scriptFolder + '/' + element + ': ' + error);
                }
            });
        });
    };

    var resetDataBase = function (dbName, done) {
        exec('mongo ' + dbName + ' --eval "db.dropDatabase()"', function (error, stdout, stderr) {
            done(error);
        });
    };

	var fetchTemplate = function (templateName) {
		return fs.readFileSync('./spec-migration-scripts/' + templateName + '.js', 'utf8');
	};

    var writeMigrationFile = function (migrationName, migrationScript, callback) {
        var testFile = getFiles('./' + scriptFolder, '^(\\d{17}[-])' + migrationName + '.js')[0];
        fs.writeFile('./' + scriptFolder + '/' + testFile, migrationScript, function(err){
            expect(err).toBeFalsy();
            callback();
        });
    };

    /* options { migrationName, callback, [migrationScript] } */
    var runCreate = function(options) {
        exec(runCommand + ' create ' + options.migrationName, function (error, stdout, stderr) {
            expect(error).toBeFalsy();

            // Check that the create command produced a file
            expect(fileExists('./' + scriptFolder, '^(\\d{17}[-])' + options.migrationName + '.js')).toBe(true);

            var testFile = getFiles('./' + scriptFolder, '^(\\d{17}[-])' + options.migrationName + '.js')[0],
                path = './' + scriptFolder + '/' + testFile;

            fs.readFile(path, 'utf8', function(err, data) {
                expect(err).toBeFalsy();

                // Check that the file created matches the template
                expect(data).toBe(fetchTemplate('template'));

                if (typeof options.migrationScript	=== 'undefined') {
                    options.callback();
                } else {
                    writeMigrationFile(options.migrationName, options.migrationScript, options.callback);
                }
            });
        });
    };

    var obj = {
        afterEach: function (dbName, done) {
            resetFileSystem();
            resetDataBase(dbName, done);
        },
        fileExists: fileExists,
        getFiles: getFiles,
		fetchTemplate: fetchTemplate,
        runCreate: runCreate,
        mongojs: mongojs // export mongojs with extended Database prototype
    };

    return obj;
};