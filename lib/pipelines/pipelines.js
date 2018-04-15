const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { pipelineSchema, watchSchema, deleteSchema } = require('./pipelines.schemas');
const djsv = require('djsv');
const path = require('path');

class Pipelines extends EventEmitter {
    constructor() {
        super();
        this.pipelineSchema = djsv(pipelineSchema);
        this.watchSchema = djsv(watchSchema);
        this.deleteSchema = djsv(deleteSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async _delete(options) {
        let result = null;
        const schema = this.deleteSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this._client.delete(_path);
        }
        return result;
    }

    async _get(options) {
        let result = null;
        const schema = this.pipelineSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this._client.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _getList(options) {
        let result = null;
        const schema = this.pipelineSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this._client.get(_path);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.pipelineSchema(options);
        if (schema.valid) {
            const { name, data } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this._client.put(_path, data, null);
        }
        return result;
    }

    async getPipeline(options) {
        return this._get(options);
    }

    async deletePipeline(options) {
        return this._delete(options);
    }

    async getPipelines() {
        const res = await this._getList();
        let result = [];
        if (res) {
            result = Object.entries(res).map(([k, v]) => jsonHelper.tryParseJSON(v));
        }
        return result;
    }

    async setPipeline(options) {
        return this._set(options);
    }

    async watch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINES, name);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , name] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit('change', { name, data });
        });
        watch.watcher.on('delete',res=>this.emit('delete',sonHelper.tryParseJSON(res.value.toString())));
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINES, name);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Pipelines;

