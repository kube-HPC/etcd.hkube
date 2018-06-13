const EventEmitter = require('events');
const Watcher = require('../../watch/watcher');
const jsonHelper = require('../../helper/json');
const { PREFIX } = require('../../consts');
const { getSchema, setSchema, deleteSchema } = require('./schema');
const djsv = require('djsv');
const path = require('path');

class AlgorithmQueue extends EventEmitter {
    constructor() {
        super();
        this._getSchema = djsv(getSchema);
        this._setSchema = djsv(setSchema);
        this._deleteSchema = djsv(deleteSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async _delete(options) {
        const schema = this._deleteSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, name);
        return this._client.delete(_path);
    }

    async _get(options, settings) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, name);
        return this._client.get(_path, settings);
    }

    async _set(options) {
        const schema = this._setSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { instance } = schema;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, instance.name);
        return this._client.put(_path, instance);
    }

    get(options) {
        return this._get(options, { isPrefix: false });
    }

    set(options) {
        return this._set(options);
    }

    delete(options) {
        return this._delete(options);
    }

    async list(options) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, name);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => l.value);
    }

    async watch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, name);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit('change', data);
        });
        watch.watcher.on('delete', (res) => {
            const [, , alg] = res.key.toString().split('/');
            this.emit('delete', { name: alg });
        });
        return { name, data: watch.data };
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, name);
        return this._watcher.unwatch(_path);
    }
}

module.exports = AlgorithmQueue;
