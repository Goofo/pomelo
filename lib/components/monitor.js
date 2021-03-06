/**
 * Component for monitor.
 * Load and start monitor client.
 */
const Monitor = require('../monitor/monitor');


/**
 * Component factory function
 *
 * @param  {Object} app  current application context
 * @return {Object}      component instances
 */
module.exports = function (app, opts) {
    return new Component(app, opts);
};

const Component = function (app, opts) {
    this.monitor = new Monitor(app, opts);
};

const pro = Component.prototype;

pro.name = '__monitor__';

pro.start = function (cb) {
    this.monitor.start(cb);
};

pro.stop = function (force, cb) {
    this.monitor.stop(cb);
};

pro.reconnect = function (masterInfo) {
    this.monitor.reconnect(masterInfo);
};
