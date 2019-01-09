const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { getWorkersSchema, setWorkersSchema, watchSchema } = require('./schema');

class Drivers extends EventEmitter {
    constructor() {
        super();
        this.getWorkersSchema = djsv(getWorkersSchema);
        this.setWorkersSchema = djsv(setWorkersSchema);
        this.watchSchema = djsv(watchSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async setState(options) {
        const { driverId, status, error } = options;
        return this._set({ driverId, data: { status, error } });
    }

    async getState(options) {
        const { driverId } = options;
        return this._get({ driverId });
    }

    async _get(options) {
        const schema = this.getWorkersSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { driverId } = schema.instance;
        const _path = path.join('/', PREFIX.DRIVERS, driverId);
        return this._client.get(_path, { isPrefix: false });
    }

    async _set(options) {
        const schema = this.setWorkersSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { driverId, data } = schema.instance;
        const _path = path.join('/', PREFIX.DRIVERS, driverId);
        return this._client.put(_path, data, null);
    }

    async delete(options) {
        const schema = this.getWorkersSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { driverId } = schema.instance;
        const _path = path.join('/', PREFIX.DRIVERS, driverId);
        return this._client.delete(_path, { isPrefix: true });
    }

    async singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    async watch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { driverId } = schema.instance;
        const _path = path.join('/', PREFIX.DRIVERS, driverId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , id] = res.key.toString().split('/');
            const data = { ...jsonHelper.tryParseJSON(res.value.toString()), driverId: id };
            this.emit('change', data);
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { driverId } = schema.instance;
        const _path = path.join('/', PREFIX.DRIVERS, driverId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Drivers;
