const HttpServer = require('http').Server;
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const WebSocketServer = require('ws').Server;

const ST_STARTED = 1;
const ST_CLOSED = 2;

/**
 * websocket protocol processor
 */
class Processor extends EventEmitter {
    constructor() {
        super();

        this._init.apply(this, arguments)
    }

    _init() {
        this.httpServer = new HttpServer();

        const self = this;
        this.wsServer = new WebSocketServer({server: this.httpServer});

        this.wsServer.on('connection', function (socket) {
            // emit socket to outside
            self.emit('connection', socket);
        });

        this.state = ST_STARTED;
    }
}

module.exports = Processor;

Processor.prototype.add = function (socket, data) {
    if (this.state !== ST_STARTED) {
        return;
    }
    this.httpServer.emit('connection', socket);
    if (typeof socket.ondata === 'function') {
        // compatible with stream2
        socket.ondata(data, 0, data.length);
    } else {
        // compatible with old stream
        socket.emit('data', data);
    }
};

Processor.prototype.close = function () {
    if (this.state !== ST_STARTED) {
        return;
    }
    this.state = ST_CLOSED;
    this.wsServer.close();
    this.wsServer = null;
    this.httpServer = null;
};
