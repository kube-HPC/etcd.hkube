const EventEmitter = require('events');
const { PREFIX, SUFFIX } = require('../consts');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./jobs.schemas');
const djsv = require('djsv');
const path = require('path');

class Jobs extends EventEmitter {
    constructor() {
        super();
        this.watchSchema = djsv(watchSchema);
        this.jobResultsSchema = djsv(jobResultsSchema);
        this.getJobSchema = djsv(getJobSchema);
        this._watchesMap = new Map();
    }

    init(parent) {
        this.parent = parent;
    }

    _watch(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.watchSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, suffix, index, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
                this.parent.etcd.get(_path, {}, (err, obj) => {
                    const watcher = this.parent.etcd.watcher(_path, index, etcdOptions);
                    if (err) {
                        if (err.errorCode == 100) {
                            return res({ obj: {}, watcher });
                        }
                        return rej(err)
                    }
                    return res({ obj: this.parent._tryParseJSON(obj.node.value), watcher });
                });
            }
            else {
                return rej(new Error(schemaInstance.error));
            }
        });
    }

    _get(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.getJobSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, suffix, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
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
        const schemaInstance = this.jobResultsSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            const { jobId, data, suffix } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errors);
        }
    }

    async getState(options) {
        const result = await this._get({ suffix: 'state', jobId: options.jobId });
        if (!result) {
            return null;
        }
        return this.parent._tryParseJSON(result.value);
    }

    async setState(options) {
        return await this._set({ suffix: 'state', data: { state: options.state }, jobId: options.jobId });
    }

    async stop(options) {
        return await this._set({ suffix: 'state', data: { state: 'stop', reason: options.reason }, jobId: options.jobId });
    }

    async watch(options) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        options.suffix = 'state';
        const watch = await this._watch(options);
        watch.watcher.on('set', res => {
            const value = this.parent._tryParseJSON(res.node.value);
            const data = Object.assign({}, value, { jobId: options.jobId });
            this.emit('change', data);
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

    _createKey({ jobId }) {
        return [jobId].join(':');
    }
}

module.exports = Jobs;
