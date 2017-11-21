const { PREFIX, SUFFIX } = require('../consts');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./jobResults.schemas');
const djsv = require('djsv');
const path = require('path');

class jobResults {
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
                const _path = path.join('/', PREFIX.JOBS, 'jobResults', jobId, suffix);
                this.parent.etcd.get(_path, etcdOptions, (err, obj) => {
                    if (err) {
                        if (err.errorCode == 100) {
                            return res({});
                        }
                        return rej(err);
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
            const _path = path.join('/', PREFIX.JOBS, 'jobResults', jobId, suffix);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errors[0].stack);
        }
    }

    async getResultsByStatus(options) {
        return await this._getResultsByFilter(j => j.status === options.status);
    }

    async getResults(filter) {
        return await this._getResultsByFilter(filter);
    }

    async _getResultsByFilter(filter) {
        const result = await this._get();
        const jobs = [];
        if (!result.nodes) {
            return jobs;
        }
        result.nodes.forEach(node => {
            const array = node.key.split('/');
            const job = Object.create(null);
            job.id = array[3];
            node.nodes.forEach(n => {
                const key = n.key.substr(n.key.lastIndexOf('/') + 1);
                job[key] = this.parent._tryParseJSON(n.value);
            });
            jobs.push(job);
        });
        return jobs.filter(filter);
    }

    async getResult(options) {
        const result = await this._get({ suffix: 'result', jobId: options.jobId });
        return this.parent._tryParseJSON(result.value);
    }

    async getStatus(options) {
        const result = await this._get({ suffix: 'status', jobId: options.jobId });
        return this.parent._tryParseJSON(result.value);
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
            const array = res.node.key.split('/');
            const jobId = array[3];
            const type = array[4];
            const data = this.parent._tryParseJSON(res.node.value);
            callback({ jobId, data, type });
        });
        return { stop: watch.watcher.stop, obj: watch.obj };
    }
}

module.exports = jobResults;

