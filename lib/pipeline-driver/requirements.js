const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { getSchema, setSchema, deleteSchema } = require('./schema');
const djsv = require('djsv');
const path = require('path');

class PipelineDriverRequirements extends EventEmitter {
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
        let result = null;
        const schema = this._deleteSchema(options);
        if (schema.valid) {
            const { queueName } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINE_DRIVER_REQUIREMENTS, queueName);
            result = await this._client.delete(_path);
        }
        return result;
    }

    async _get(options, settings) {
        let result = null;
        const schema = this._getSchema(options);
        if (schema.valid) {
            const { queueName } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINE_DRIVER_REQUIREMENTS, queueName);
            result = await this._client.get(_path, settings);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this._setSchema(options);
        if (schema.valid) {
            const { queueName, data } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINE_DRIVER_REQUIREMENTS, queueName);
            result = await this._client.put(_path, data);
        }
        return result;
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
        const { queueName } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINE_DRIVER_REQUIREMENTS, queueName);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => l.value);
    }

    async watch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { queueName } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINE_DRIVER_REQUIREMENTS, queueName);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , queueName] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit('change', { queueName, data });
        });
        watch.watcher.on('delete', (res) => {
            const [, , queueName] = res.key.toString().split('/');
            this.emit('delete', { queueName });
        });
        return { queueName, data: watch.data };
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { queueName } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINE_DRIVER_REQUIREMENTS, queueName);
        return this._watcher.unwatch(_path);
    }
}

module.exports = PipelineDriverRequirements;
