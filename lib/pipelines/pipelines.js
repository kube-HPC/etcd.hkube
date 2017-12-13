const EventEmitter = require('events');
const { PREFIX, SUFFIX } = require('../consts');
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

    async  _watch(options) {
        const result = this.watchSchema(options);
        if (result.valid) {
            const { name, index, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            return await this.etcd.getAndWatch(_path)

        }
    }
    async _delete(options) {
        const result = this.deleteSchema(options);
        if (result.valid) {
            const { name, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            await this.etcd.delete(_path)
        }
    }

    async _get(options) {
        const result = this.pipelineSchema(options);
        if (result.valid) {
            const { name, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            return await this.etcd.get(_path, { isPrefix: false });
        }
    }
    async _getList(options) {
        const result = this.pipelineSchema(options);
        if (result.valid) {
            const { name, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            return await this.etcd.get(_path);
        }
    }
    async _set(options) {
        console.log(`_set`);
        const result = this.pipelineSchema(options);
        if (result.valid) {
            const { name, data } = result.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            return await this.etcd.put(_path, data, null);
        }

    }

    async getPipeline(options) {
        return await this._get(options);

    }

    async deletePipeline(options) {
        return await this._delete(options);
    }

    async getPipelines(options) {
        const res = await this._getList();
        let result = [];
        if (res) {
            result = Object.entries(res).map(([k, v]) => { this.parent._tryParseJSON(v) })
        }
        return result;
    }

    async setPipeline(options) {
        return await this._set(options);
    }

    async watch(options) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        const watch = await this._watch(options);
        this._watchesMap.set(key, watch.watcher);
        watch.watcher.on('put', res => {
            let keyData = res.key.toString().split('/')
            const name = keyData[2];

            const data = this.parent._tryParseJSON(res.value.toString());
            this.emit('change', { name, data });
        });
        return watch.obj;
    }

    async unwatch(options) {
        options = options || {};
        return await this._unwatch(options);
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

