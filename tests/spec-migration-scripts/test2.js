exports.up = function(dbContext, next){
    var db = dbContext.resources.db,
        mongodb = dbContext.resources.mongodb;

    next();
};

exports.down = function(dbContext, next){
    var db = dbContext.resources.db,
        mongodb = dbContext.resources.mongodb;

    next();
};
