const { PREFIX, SUFFIX } = require('../consts');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./jobs.schemas');
const djsv = require('djsv');
const path = require('path');

class jobs {
    constructor() {
        this.watchSchema = djsv(watchSchema);
        this.jobResultsSchema = djsv(jobResultsSchema);
        this.getJobSchema = djsv(getJobSchema);
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
                return rej(new Error(schemaInstance.errors[0].stack));
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
                        return rej(err)
                    }
                    return res(obj.node);
                });
            } else {
                return rej(new Error(schemaInstance.errors[0].stack));
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
            throw new Error(schemaInstance.errors[0].stack);
        }
    }

    async getState(options) {
        const result = await this._get({ suffix: 'state', jobId: options.jobId });
        return this.parent._tryParseJSON(result.value);
    }

    async setState(options) {
        return await this._set({ suffix: 'state', data: options.state, jobId: options.jobId });
    }

    async stop(options) {
        return await this._set({ suffix: 'state', data: { state: 'stopped', reason: options.reason }, jobId: options.jobId });
    }

    async onStopped(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        options.suffix = 'state';
        const watch = await this._watch(options);
        watch.watcher.on('change', res => {
            const data = this.parent._tryParseJSON(res.node.value);
            if (data.state === 'stopped') {
                callback(data);
            }
        });
        return { stop: watch.watcher.stop, obj: watch.obj };
    }

    async onStateChanged(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        options.suffix = 'state';
        const watch = await this._watch(options);
        watch.watcher.on('change', res => {
            const state = this.parent._tryParseJSON(res.node.value);
            callback({ state });
        });
        return { stop: watch.watcher.stop, obj: watch.obj };
    }
}

module.exports = jobs;
