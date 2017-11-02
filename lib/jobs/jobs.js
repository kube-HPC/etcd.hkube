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
                const { jobId, index, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, 'jobResults', jobId);
                this.parent.etcd.get(_path, {}, (err, obj) => {
                    const watcher = this.parent.etcd.watcher(_path, index, etcdOptions);
                    if (err) {
                        if (err.errorCode == 100) {
                            return res({ obj: {}, watcher });
                        } else {
                            return rej(err)
                        }
                    }
                    return res({ obj, watcher });
                });
            }
            else {
                return rej(new Error(schemaInstance.errorDescription));
            }
        });
    }

    _get(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.getJobSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, suffix, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, 'jobResults', jobId, suffix);
                this.parent.etcd.get(_path, etcdOptions, (err, obj) => {
                    if (err) {
                        return rej(err)
                    }
                    return res(this.parent._tryParseJSON(obj.node.value));
                });
            } else {
                return rej(new Error(schemaInstance.errorDescription));
            }
        });
    }

    async _set(options) {
        const schemaInstance = this.jobResultsSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            const { jobId, data, suffix } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.JOBS, 'jobResults', jobId, suffix);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errorDescription);
        }
    }

    async getResult(options) {
        return await this._get({ suffix: 'result', jobId: options.jobId });
    }

    async getStatus(options) {
        return await this._get({ suffix: 'status', jobId: options.jobId });
    }

    async setResults(options) {
        return await this._set({ suffix: 'result', data: options.data, jobId: options.jobId });
    }

    async setStatus(options) {
        return await this._set({ suffix: 'status', data: options.data, jobId: options.jobId });
    }

    async onResult(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const watch = await this._watch(options);
        watch.watcher.on('change', res => {
            const jobId = res.node.key.split('/')[3];
            const data = this.parent._tryParseJSON(res.node.value);
            callback({ jobId, data });
        });
    }
}

module.exports = jobs;
