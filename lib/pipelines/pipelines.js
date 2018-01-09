const EventEmitter = require('events');
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
        this._watchesMap = new Map();
    }

    init(parent) {
        this.parent = parent;
        this.etcd = this.parent.etcd3;
    }

    async _watch(options) {
        let result = null;
        const schema = this.watchSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this.etcd.getAndWatch(_path, { isPrefix: false });
        }
        return result;
    }

    async _delete(options) {
        let result = null;
        const schema = this.deleteSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this.etcd.delete(_path);
        }
        return result;
    }

    async _get(options) {
        let result = null;
        const schema = this.pipelineSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this.etcd.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _getList(options) {
        let result = null;
        const schema = this.pipelineSchema(options);
        if (schema.valid) {
            const { name } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this.etcd.get(_path);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.pipelineSchema(options);
        if (schema.valid) {
            const { name, data } = schema.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            result = await this.etcd.put(_path, data, null);
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
            result = Object.entries(res).map(([k, v]) => this.parent._tryParseJSON(v));
        }
        return result;
    }

    async setPipeline(options) {
        return this._set(options);
    }

    async watch(options) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        const watch = await this._watch(options);
        this._watchesMap.set(key, watch.watcher);
        watch.watcher.on('put', (res) => {
            const keyData = res.key.toString().split('/');
            const name = keyData[2];
            const data = this.parent._tryParseJSON(res.value.toString());
            this.emit('change', { name, data });
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        return this._unwatch(options);
    }

    _unwatch(options) {
        return new Promise((res, rej) => {
            const result = this.watchSchema(options);
            if (result.valid) {
                const key = this._createKey(result.instance);
                const watcher = this._watchesMap.get(key);
                if (!watcher) {
                    return rej(new Error(`unable to find watcher for ${JSON.stringify(result.instance)}`));
                }
                watcher.on('end', (data) => {
                    return res(data);
                });
                watcher.cancel();
                this._watchesMap.delete(key);
            }
            else {
                return rej(new Error(result.error));
            }
        });
    }

    _createKey({ name }) {
        return [name].join(':');
    }
}

module.exports = Pipelines;

