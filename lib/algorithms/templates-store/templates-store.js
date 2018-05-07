const EventEmitter = require('events');
const Watcher = require('../../watch/watcher');
const jsonHelper = require('../../helper/json');
const { PREFIX } = require('../../consts');
const { getSchema, setSchema, deleteSchema, watchSchema } = require('./schema');
const djsv = require('djsv');
const path = require('path');

class TemplatesStore extends EventEmitter {
    constructor() {
        super();
        this._getSchema = djsv(getSchema);
        this._setSchema = djsv(setSchema);
        this._deleteSchema = djsv(deleteSchema);
        this._watchSchema = djsv(watchSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async _delete(options) {
        let result = null;
        const schema = this._deleteSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.TEMPLATE_STORE, name);
            result = await this._client.delete(_path);
        }
        return result;
    }

    async _get(options, settings) {
        let result = null;
        const schema = this._getSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.TEMPLATE_STORE, name);
            result = await this._client.get(_path, settings);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this._setSchema(options);
        if (schema.valid) {
            const { data, name } = schema.instance;
            const _path = path.join('/', PREFIX.TEMPLATE_STORE, name);
            result = await this._client.put(_path, data);
        }
        return result;
    }

    getAlgorithm(options) {
        return this._get(options, { isPrefix: false });
    }

    deleteAlgorithm(options) {
        return this._delete(options);
    }

    setAlgorithm(options) {
        return this._set(options);
    }

    async list() {
        const res = await this._get(null, { isPrefix: true });
        let result = [];
        if (res) {
            result = Object.entries(res).map(([k, v]) => jsonHelper.tryParseJSON(v));
        }
        return result;
    }

    async watch(options) {
        options = options || {};
        const schema = this._watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.TEMPLATE_STORE, name);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , alg] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit('change', { name: alg, data });
        });
        return { name, data: watch.data };
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.TEMPLATE_STORE, name);
        return this._watcher.unwatch(_path);
    }
}

module.exports = TemplatesStore;
