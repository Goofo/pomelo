const pomelo = require('../');
const should = require('should');
const mockBase = process.cwd() + '/test';

describe('pomelo', function () {
    describe('#createApp', function () {
        it('should create and get app, be the same instance', function (done) {
            const app = pomelo.createApp({base: mockBase});
            should.exist(app);

            const app2 = pomelo.app;
            should.exist(app2);
            should.strictEqual(app, app2);
            done();
        });
    });
});
