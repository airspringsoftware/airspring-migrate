module.exports = Logger;

var _ = require('underscore');

/**
 * Log a keyed message.
 */
/**
 * Function which outputs information about the state of the migration process
 * @param msg
 * @param error
 */
function Logger(silent) {
    this.silent = silent || false;
}

_.extend(Logger.prototype, {
    log: function (key, msg, error) {
        if (!this.silent) {
            if (!error) {
                console.log('  \033[90m%s :\033[0m \033[36m%s\033[0m', key, msg);
            } else {
                console.error(key, msg);
            }
        }
    }
});
