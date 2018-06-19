const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { getSchema, setSchema, deleteSchema } = require('./schema');

class Webhooks extends EventEmitter {
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
        const { jobId, type } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId, type);
        return this._client.delete(_path);
    }

    async _get(options, settings) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, type } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId, type);
        let result = await this._client.get(_path, settings);
        if (result) {
            result = { jobId, ...result };
        }
        return result;
    }

    async _set(options) {
        const schema = this._setSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, data, type } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId, type);
        return this._client.put(_path, data, null);
    }

    async list(options) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, type } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId, type);
        const list = await this._client.getByQuery(_path, options);
        const map = Object.create(null);
        list.forEach((l) => {
            if (!map[l.key]) {
                map[l.key] = {};
            }
            map[l.key][l.key2] = l.value;
        });
        return Object.entries(map).map(([k, v]) => ({ jobId: k, ...v }));
    }

    async get(options) {
        return this._get(options, { isPrefix: false });
    }

    async set(options) {
        return this._set(options);
    }

    delete(options) {
        return this._delete(options);
    }

    async watch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , job, type] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit(`${type}-change`, { jobId: job, ...data });
        });
        watch.watcher.on('delete', (res) => {
            const [, , job, type] = res.key.toString().split('/');
            this.emit(`${type}-delete`, { jobId: job });
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Webhooks;

