/*
 * Modifies the DataDictionary collection and references to it in order to preface it with the airspring namespace
 */
exports.up = function(dbContext, next){
	var dbDriver = dbContext.dbDriver,
		connection = dbContext.connection,
		mongodb = dbContext.requirements.mongodb,
		airspring = dbContext.requirements.airspring;
	_ = dbContext._;

	try {
		var applications = new airspring.ApplicationCollection();
		airspring.airspring.Model.sync = airspring.Backbone.sync = dbDriver.sync;


		applications.fetch({
			fetchAll: true,
			success: function() {
				applications.each(function (app) {
					app.set('TestAttribute', 1);
				});

				applications.save({
					saveAll: true,
					success: function () {
						next();
					},
					error: function () {
						next('error saving applications');
					}
				});
			},
			error: function() {
				next('error fetch applications');
			}
		});
	} catch(ex) {
		next(ex);
	}
};

// Create several new applications
exports.down = function(dbContext, next){
	var dbDriver = dbContext.dbDriver,
		connection = dbContext.connection,
		mongodb = dbContext.requirements.mongodb,
		airspring = dbContext.requirements.airspring;
	_ = dbContext._;

	try {
		var applications = new airspring.ApplicationCollection();
		airspring.airspring.Model.sync = airspring.Backbone.sync = dbDriver.sync;

		applications.fetch({
			fetchAll: true,
			success: function() {
				applications.each(function (app) {
					app.unset('TestAttribute');
				});

				applications.save({
					saveAll: true,
					success: function () {
						next();
					},
					error: function () {
						next('error saving applications');
					}
				});
			},
			error: function() {
				next('error fetch applications');
			}
		});
	} catch(ex) {
		next(ex);
	}
};