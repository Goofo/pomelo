const fs = require('fs');
const path = require('path');
const protobuf = require('pomelo-protobuf');
const Constants = require('../util/constants');
const crypto = require('crypto');
const logger = require('pomelo-logger').getLogger('pomelo', __filename);

module.exports = function (app, opts) {
    return new Component(app, opts);
};

const Component = function (app, opts) {
    this.app = app;
    opts = opts || {};
    this.watchers = {};
    this.serverProtos = {};
    this.clientProtos = {};
    this.version = "";

    const env = app.get(Constants.RESERVED.ENV);
    const originServerPath = path.join(app.getBase(), Constants.FILEPATH.SERVER_PROTOS);
    const presentServerPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.SERVER_PROTOS));
    const originClientPath = path.join(app.getBase(), Constants.FILEPATH.CLIENT_PROTOS);
    const presentClientPath = path.join(Constants.FILEPATH.CONFIG_DIR, env, path.basename(Constants.FILEPATH.CLIENT_PROTOS));

    this.serverProtosPath = opts.serverProtos || (fs.existsSync(originServerPath) ? Constants.FILEPATH.SERVER_PROTOS : presentServerPath);
    this.clientProtosPath = opts.clientProtos || (fs.existsSync(originClientPath) ? Constants.FILEPATH.CLIENT_PROTOS : presentClientPath);

    this.setProtos(Constants.RESERVED.SERVER, path.join(app.getBase(), this.serverProtosPath));
    this.setProtos(Constants.RESERVED.CLIENT, path.join(app.getBase(), this.clientProtosPath));

    protobuf.init({encoderProtos: this.serverProtos, decoderProtos: this.clientProtos});
};

const pro = Component.prototype;

pro.name = '__protobuf__';

pro.encode = function (key, msg) {
    return protobuf.encode(key, msg);
};

pro.encode2Bytes = function (key, msg) {
    return protobuf.encode2Bytes(key, msg);
};

pro.decode = function (key, msg) {
    return protobuf.decode(key, msg);
};

pro.getProtos = function () {
    return {
        server: this.serverProtos,
        client: this.clientProtos,
        version: this.version
    };
};

pro.getVersion = function () {
    return this.version;
};

pro.setProtos = function (type, path) {
    if (!fs.existsSync(path)) {
        return;
    }

    if (type === Constants.RESERVED.SERVER) {
        this.serverProtos = protobuf.parse(require(path));
    }

    if (type === Constants.RESERVED.CLIENT) {
        this.clientProtos = protobuf.parse(require(path));
    }

    const protoStr = JSON.stringify(this.clientProtos) + JSON.stringify(this.serverProtos);
    this.version = crypto.createHash('md5').update(protoStr).digest('base64');

    //Watch file
    const watcher = fs.watch(path, this.onUpdate.bind(this, type, path));
    if (this.watchers[type]) {
        this.watchers[type].close();
    }
    this.watchers[type] = watcher;
};

pro.onUpdate = function (type, path, event) {
    if (event !== 'change') {
        return;
    }

    const self = this;
    fs.readFile(path, 'utf8', function (err, data) {
        try {
            const protos = protobuf.parse(JSON.parse(data));
            if (type === Constants.RESERVED.SERVER) {
                protobuf.setEncoderProtos(protos);
                self.serverProtos = protos;
            } else {
                protobuf.setDecoderProtos(protos);
                self.clientProtos = protos;
            }

            const protoStr = JSON.stringify(self.clientProtos) + JSON.stringify(self.serverProtos);
            self.version = crypto.createHash('md5').update(protoStr).digest('base64');
            logger.info('change proto file , type : %j, path : %j, version : %j', type, path, self.version);
        } catch (e) {
            logger.warn("change proto file error! path : %j", path);
            logger.warn(e);
        }
    });
};

pro.stop = function (force, cb) {
    for (let type in this.watchers) {
        this.watchers[type].close();
    }
    this.watchers = {};
    process.nextTick(cb);
};
