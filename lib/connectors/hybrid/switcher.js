const EventEmitter = require('events').EventEmitter;
const util = require('util');
const WSProcessor = require('./wsprocessor');
const TCPProcessor = require('./tcpprocessor');
const logger = require('pomelo-logger').getLogger('pomelo', __filename);

const HTTP_METHODS = [
    'GET', 'POST', 'DELETE', 'PUT', 'HEAD'
];

const ST_STARTED = 1;
const ST_CLOSED = 2;

const DEFAULT_TIMEOUT = 90;

/**
 * Switcher for tcp and websocket protocol
 *
 * @param {Object} server tcp server instance from node.js net module
 */
class Switcher extends EventEmitter {
    constructor() {
        super();

        this._init.apply(this, arguments)
    }

    _init(server, opts) {
        this.server = server;
        this.wsprocessor = new WSProcessor();
        this.tcpprocessor = new TCPProcessor(opts.closeMethod);
        this.id = 1;
        this.timeout = (opts.timeout || DEFAULT_TIMEOUT) * 1000;
        this.setNoDelay = opts.setNoDelay;

        if (!opts.ssl) {
            this.server.on('connection', this.newSocket.bind(this));
        } else {
            this.server.on('secureConnection', this.newSocket.bind(this));
            this.server.on('clientError', function (e, tlsSo) {
                logger.warn('an ssl error occured before handshake established: ', e);
                tlsSo.destroy();
            });
        }

        this.wsprocessor.on('connection', this.emit.bind(this, 'connection'));
        this.tcpprocessor.on('connection', this.emit.bind(this, 'connection'));

        this.state = ST_STARTED;
    }
}

module.exports = Switcher;

Switcher.prototype.newSocket = function (socket) {
    if (this.state !== ST_STARTED) {
        return;
    }

    socket.setTimeout(this.timeout, function () {
        logger.warn('connection is timeout without communication, the remote ip is %s && port is %s',
            socket.remoteAddress, socket.remotePort);
        socket.destroy();
    });

    const self = this;

    socket.once('data', function (data) {
        // FIXME: handle incomplete HTTP method
        if (isHttp(data)) {
            processHttp(self, self.wsprocessor, socket, data);
        } else {
            if (!!self.setNoDelay) {
                socket.setNoDelay(true);
            }
            processTcp(self, self.tcpprocessor, socket, data);
        }
    });
};

Switcher.prototype.close = function () {
    if (this.state !== ST_STARTED) {
        return;
    }

    this.state = ST_CLOSED;
    this.wsprocessor.close();
    this.tcpprocessor.close();
};

const isHttp = function (data) {
    const head = data.toString('utf8', 0, 4);

    for (let i = 0, l = HTTP_METHODS.length; i < l; i++) {
        if (head.indexOf(HTTP_METHODS[i]) === 0) {
            return true;
        }
    }

    return false;
};

const processHttp = function (switcher, processor, socket, data) {
    processor.add(socket, data);
};

const processTcp = function (switcher, processor, socket, data) {
    processor.add(socket, data);
};
