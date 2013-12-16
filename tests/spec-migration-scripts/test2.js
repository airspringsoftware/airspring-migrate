exports.up = function(resources, next){
    var db = resources.db,
        mongodb = resources.mongodb;

    next();
};

exports.down = function(resources, next){
    var db = resources.db,
        mongodb = resources.mongodb;

    next();
};
