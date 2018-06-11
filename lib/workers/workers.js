const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const { PREFIX } = require('../consts');
const { getWorkersSchema, setWorkersSchema, watchSchema } = require('./schema');
const djsv = require('djsv');
const path = require('path');

class Workers extends EventEmitter {
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
        const { workerId, status, error } = options;
        return this._set({ workerId, data: { status, error } });
    }

    async getState(options) {
        const { workerId } = options;
        return this._get({ workerId });
    }

    async _get(options) {
        const schema = this.getWorkersSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { workerId } = schema.instance;
        const _path = path.join('/', PREFIX.WORKERS, workerId);
        return this._client.get(_path, { isPrefix: false });
    }

    async _set(options) {
        const schema = this.setWorkersSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { workerId, data } = schema.instance;
        const _path = path.join('/', PREFIX.WORKERS, workerId);
        return this._client.put(_path, data, null);
    }

    async delete(options) {
        const schema = this.getWorkersSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { workerId } = schema.instance;
        const _path = path.join('/', PREFIX.WORKERS, workerId);
        return this._client.delete(_path, { isPrefix: true });
    }

    async watch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { workerId } = schema.instance;
        const _path = path.join('/', PREFIX.WORKERS, workerId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , id] = res.key.toString().split('/');
            const data = { ...JSON.parse(res.value.toString()), workerId: id };
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
        const { workerId } = schema.instance;
        const _path = path.join('/', PREFIX.WORKERS, workerId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Workers;
