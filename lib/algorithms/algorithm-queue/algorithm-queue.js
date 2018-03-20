const EventEmitter = require('events');
const Watcher = require('../../watch/watcher');
const jsonHelper = require('../../helper/json');
const { PREFIX } = require('../../consts');
const { getSchema, setSchema, watchSchema } = require('./schema');
const djsv = require('djsv');
const path = require('path');

class AlgorithmQueue extends EventEmitter {
    constructor() {
        super();
        this._getSchema = djsv(getSchema);
        this._setSchema = djsv(setSchema);
        this._watchSchema = djsv(watchSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async _get(options, settings) {
        let result = null;
        const schema = this._getSchema(options);
        if (schema.valid) {
            const { queueName } = schema.instance;
            const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, queueName);
            result = await this._client.get(_path, settings);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this._setSchema(options);
        if (schema.valid) {
            const { data, queueName } = schema.instance;
            const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, queueName);
            result = await this._client.put(_path, data);
        }
        return result;
    }

    async getState(options) {
        return this._get(options, { isPrefix: false });
    }

    async setState(options) {
        return this._set(options);
    }

    async list() {
        const results = [];
        const result = await this._get(null, { isPrefix: true });
        if (!result) {
            return results;
        }
        Object.entries(result).forEach(([k, v]) => {
            const [, , queueName] = k.split('/');
            const data = jsonHelper.tryParseJSON(v);
            results.push({ queueName, data });
        });
        return results;
    }

    async watch(options) {
        options = options || {};
        const schema = this._watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { queueName } = schema.instance;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, queueName);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , queueName] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit('change', { queueName, data });
        });
        return { queueName, data: watch.data };
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { queueName } = schema.instance;
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, queueName);
        return this._watcher.unwatch(_path);
    }
}

module.exports = AlgorithmQueue;
