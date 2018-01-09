const EventEmitter = require('events');
const { PREFIX, SUFFIX } = require('../consts');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./jobResults.schemas');
const djsv = require('djsv');
const path = require('path');

class JobResults extends EventEmitter {
    constructor() {
        super();
        this.watchSchema = djsv(watchSchema);
        this.jobResultsSchema = djsv(jobResultsSchema);
        this.getJobSchema = djsv(getJobSchema);
        this._watchesMap = new Map();
    }

    init(parent) {
        this.parent = parent;
        this.etcd = this.parent.etcd3;
    }

    async  _watch(options) {
        const result = this.watchSchema(options);
        if (result.valid) {
            const { jobId, index, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId);
            return await this.etcd.getAndWatch(_path)
        }
    }

    async _get(options) {
        const result = this.getJobSchema(options);
        if (result.valid) {
            const { jobId, suffix, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            const data = await this.etcd.get(_path, { isPrefix: false });
            if (!data) {
                return null;
            }
            return { jobId, ...data };
        }
    }

    async _getList(options) {
        const result = this.getJobSchema(options);
        if (result.valid) {
            const { jobId, suffix, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            return await this.etcd.get(_path);
        }
    }

    async _set(options) {
        const result = this.jobResultsSchema(options);
        if (result.valid) {
            const { jobId, data, suffix } = result.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            return await this.etcd.put(_path, data, null);
        }
    }

    async getResultsByStatus(options) {
        return await this._getResultsByFilter(j => j.status === options.status);
    }

    async getResults(filter) {
        return await this._getResultsByFilter(filter);
    }

    async _getResultsByFilter(filter) {
        const result = await this._getList();
        const jobs = [];
        if (!result) {
            return jobs;
        }
        Object.entries(result).forEach(([k, v]) => {
            const array = k.split('/');
            let job = null;
            job = jobs.find(j => j.id == array[2])
            if (!job) {
                job = {};
                job.id = array[2];
                jobs.push(job);
            }
            job[array[3]] = this.parent._tryParseJSON(v);
        });
        return jobs.filter(filter);
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

    async watch(options, callback) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        const watch = await this._watch(options);
        watch.watcher.on('put', res => {
            const arr = res.key.toString().split('/');
            const jobId = arr[2];
            const type = arr[3];
            const data = this.parent._tryParseJSON(res.value.toString());
            this.emit(`${type}-change`, { jobId, ...data });
        });
        this._watchesMap.set(key, watch.watcher);
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        return await this._unwatch(options);
    }

    _unwatch(options) {
        return new Promise((res, rej) => {
            const result = this.watchSchema(options);
            if (result.valid) {
                const key = this._createKey(options);
                const watcher = this._watchesMap.get(key);
                if (!watcher) {
                    return rej(new Error(`unable to find watcher for ${JSON.stringify(options)}`));
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

    _createKey({ jobId }) {
        return [jobId].join(':');
    }
}

module.exports = JobResults;

