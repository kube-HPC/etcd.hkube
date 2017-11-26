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
    }

    _watch(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.watchSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { name, index, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.PIPELINES, name);
                this.parent.etcd.get(_path, {}, (err, obj) => {
                    const watcher = this.parent.etcd.watcher(_path, index, etcdOptions);
                    if (err) {
                        if (err.errorCode == 100) {
                            return res({ obj: {}, watcher });
                        }
                        return rej(err);
                    }
                    return res({ obj, watcher });
                });
            }
            else {
                return rej(new Error(schemaInstance.error));
            }
        });
    }

    _delete(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.deleteSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { name, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.PIPELINES, name);
                this.parent.etcd.del(_path, etcdOptions, (err, obj) => {
                    if (err) {
                        return rej(err);
                    }
                    return res(obj);
                });
            } else {
                return rej(new Error(schemaInstance.error));
            }
        });
    }

    _get(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.pipelineSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { name, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.PIPELINES, name);
                this.parent.etcd.get(_path, etcdOptions, (err, obj) => {
                    if (err) {
                        if (err.errorCode == 100) {
                            return res();
                        }
                        return rej(err);
                    }
                    return res(obj.node);
                });
            } else {
                return rej(new Error(schemaInstance.error));
            }
        });
    }

    async _set(options) {
        const schemaInstance = this.pipelineSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            const { name, data } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.PIPELINES, name);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.error);
        }
    }

    async getPipeline(options) {
        const pipeline = await this._get(options);
        if (!pipeline) {
            return null;
        }
        return this.parent._tryParseJSON(pipeline.value);
    }

    async deletePipeline(options) {
        return await this._delete(options);
    }

    async getPipelines(options) {
        const res = await this._get();
        let result = [];
        if (res.nodes) {
            result = res.nodes.map(n => this.parent._tryParseJSON(n.value));
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
        watch.watcher.on('set', res => {
            const name = res.node.key.split('/')[2];
            const data = this.parent._tryParseJSON(res.node.value);
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
            const schemaInstance = this.watchSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const key = this._createKey(options);
                const watcher = this._watchesMap.get(key);
                if (!watcher) {
                    return rej(new Error(`unable to find watcher for ${JSON.stringify(options)}`));
                }
                watcher.on('stop', (data) => {
                    return res(data);
                });
                watcher.stop();
                this._watchesMap.delete(key);
            }
            else {
                return rej(new Error(schemaInstance.error));
            }
        });
    }

    _createKey({ name }) {
        return [name].join(':');
    }
}

module.exports = Pipelines;

