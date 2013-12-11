/* *
 * Create several new applications
 * */
exports.up = function(dbContext, next){
	var dbDriver = dbContext.dbDriver,
		connection = dbContext.connection,
		mongodb = dbContext.requirements.mongodb,
		airspring = dbContext.requirements.airspring;

	try {
		var results = airspring.SearchCollection.search({name: ["myApp1", "myApp2", "myApp3", "myApp4"], type: [airspring.ApplicationModel, airspring.ApplicationModel, airspring.ApplicationModel, airspring.ApplicationModel]}),
			collection = new airspring.ApplicationCollection(),
			m1 = new airspring.ApplicationModel({ 'name': 'myApp1' }),
			m2 = new airspring.ApplicationModel({ 'name': 'myApp2' }),
			m3 = new airspring.ApplicationModel({ 'name': 'myApp3' }),
			m4 = new airspring.ApplicationModel({ 'name': 'myApp4' });
		collection.sync = results.sync = dbDriver.sync;

		// Check that this migration is needed
		results.fetch({
			'success': function() {
				if (results.models.length === 4) {
					next(); // Just stop here
				}  else {
					// Add the models
					collection.add(m1);
					collection.add(m2);
					collection.add(m3);
					collection.add(m4);

					collection.save({
						saveAll: true,
						success: function() {
							next();
						},
						error: function(){
							console.log('error saving');
							next('error saving collection');
						}
					});
				}
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
		airspring = dbContext.requirements.airspring,
		_ = dbContext.requirements._;

	try {
		var results = airspring.SearchCollection.search({name: ["myApp1", "myApp2", "myApp3", "myApp4"], type: [airspring.ApplicationModel, airspring.ApplicationModel, airspring.ApplicationModel, airspring.ApplicationModel]});
		results.sync = dbDriver.sync;

		results.fetch({
			success: function()
			{
				console.log('search complete');
				var models = _.clone(results.models);
				var len = models.length - 1;
				_.each(models, function(element, index, list){
					element.destroy({
						'success': function() {
							if (len <= 0) next(); // complete
							len--;
						},
						'error': function() {
							console.log('error destroying model');
							next('error removing model');
						}
					});
				});
			}
		});
	} catch(ex) {
		next(ex);
	}
};