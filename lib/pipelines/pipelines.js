const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { pipelineSchema, watchSchema, deleteSchema } = require('./pipelines.schemas');
const djsv = require('djsv');
const path = require('path');
const LOCK_KEY = `${PREFIX.PIPELINES}/locks`;

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
        const schema = this.deleteSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINES, name);
        return this._client.delete(_path);
    }

    async _get(options) {
        const schema = this.pipelineSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINES, name);
        return this._client.get(_path, { isPrefix: false });
    }

    async _set(options) {
        const schema = this.pipelineSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name, data } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINES, name);
        return this._client.put(_path, data, null);
    }

    get(options) {
        return this._get(options);
    }

    set(options) {
        return this._set(options);
    }

    delete(options) {
        return this._delete(options);
    }

    async list(options) {
        const schema = this.pipelineSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINES, name);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => l.value);
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
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX.PIPELINES, name);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , pipeline] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            if (options.lock) {
                const result = await this._client.lock(`${LOCK_KEY}/change/${pipeline}`);
                if (result) {
                    this.emit('change', data);
                }
            }
            else {
                this.emit('change', data);
            }
        });
        watch.watcher.on('delete', async (res) => {
            const [, , pipeline] = res.key.toString().split('/');
            if (options.lock) {
                const result = await this._client.lock(`${LOCK_KEY}/delete/${pipeline}`);
                if (result) {
                    this.emit('delete', { name: pipeline });
                }
            }
            else {
                this.emit('delete', { name: pipeline });
            }
        });
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

