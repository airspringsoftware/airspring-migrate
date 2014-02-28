var MigrationSet = require('./set');

exports = module.exports = migrate;

function Migration(title, up, down, num) {
	this.num = num;
	this.title = title;
	this.up = up;
	this.down = down;
}

exports.version = '0.0.1';

function migrate(opts) {
	opts = opts || {};
	// migration
	if (typeof opts.title === 'string' && opts.up && opts.down) {
        migrate.set.migrations.push(new Migration(opts.title, opts.up, opts.down, opts.num));
		// specify migration file
	} else if (typeof  opts.migrationScriptResources !== 'undefined') {
        migrate.set = new MigrationSet(opts.migrationScriptResources, opts.migrationStorageController, opts.complete, opts.log);
	} else if (!migrate.set) {
		throw new Error('must invoke migrate(path) before running migrations');
		// run migrations
	} else {
		return migrate.set;
	}
}