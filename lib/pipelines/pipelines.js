const { PREFIX, SUFFIX } = require('../consts');
const { pipelineSchema, watchSchema } = require('./pipelines.schemas');
const djsv = require('djsv');
const path = require('path');

class pipelines {
    constructor() {
        this.pipelineSchema = djsv(pipelineSchema);
        this.watchSchema = djsv(watchSchema);
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
                return rej(new Error(schemaInstance.errors[0].stack));
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
                    return res(this.parent._tryParseJSON(obj.node.value));
                });
            } else {
                return rej(new Error(schemaInstance.errors[0].stack));
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
            throw new Error(schemaInstance.errors[0].stack);
        }
    }

    async getPipeline(options) {
        return await this._get(options);
    }

    async setPipeline(options) {
        return await this._set(options);
    }

    async onPipelineSet(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const watch = await this._watch(options);
        watch.watcher.on('change', res => {
            const array = res.node.key.split('/');
            const name = array[2];
            const data = this.parent._tryParseJSON(res.node.value);
            callback({ name, data });
        });
    }
}

module.exports = pipelines;

