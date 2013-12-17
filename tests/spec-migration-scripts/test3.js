exports.up = function(resources, next){
    var db = resources.db,
        mongojs = resources.mongojs;

    next();
};

exports.down = function(resources, next){
    var db = resources.db,
        mongojs = resources.mongojs;

    next();
};
