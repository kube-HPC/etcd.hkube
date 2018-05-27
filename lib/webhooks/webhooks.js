const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { getSchema } = require('./schema');
const Webhook = require('./Webhook');
const djsv = require('djsv');
const path = require('path');

class Webhooks extends EventEmitter {
    constructor() {
        super();
        this._schema = djsv(getSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async _delete(options) {
        let result = null;
        const schema = this._schema(options);
        if (schema.valid) {
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
            result = await this._client.delete(_path);
        }
        return result;
    }

    async _get(options, settings) {
        let result = null;
        const schema = this._schema(options);
        if (schema.valid) {
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
            result = await this._client.get(_path, settings);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this._schema(options);
        if (schema.valid) {
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
            result = await this._client.put(_path, options, null);
        }
        return result;
    }

    async list(options) {
        const schema = this._schema(options);
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => l.value);
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
        const schema = this._schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit('change', new Webhook(data));
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.WEBHOOKS, jobId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Webhooks;

