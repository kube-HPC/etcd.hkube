const EventEmitter = require('events');
const { PREFIX } = require('../consts');
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

    async _watch(options) {
        let result = null;
        const schema = this.watchSchema(options);
        if (schema.valid) {
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId);
            result = await this.etcd.getAndWatch(_path, { isPrefix: false });
        }
        return result;
    }

    async _get(options) {
        let result = null;
        const schema = this.getJobSchema(options);
        if (schema.valid) {
            const { jobId, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            const data = await this.etcd.get(_path, { isPrefix: false });
            if (data) {
                result = { jobId, ...data };
            }
        }
        return result;
    }

    async _getList(options) {
        let result = null;
        const schema = this.getJobSchema(options);
        if (schema.valid) {
            const { jobId, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            result = await this.etcd.get(_path);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.jobResultsSchema(options);
        if (schema.valid) {
            const { jobId, data, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            result = await this.etcd.put(_path, data, null);
        }
        return result;
    }

    async getResultsByStatus(options) {
        return this._getResultsByFilter(j => j.status === options.status);
    }

    async getResultsByFilter(filter) {
        return this._getResultsByFilter(filter);
    }

    async _getResultsByFilter(filter) {
        const results = [];
        const list = await this._getList();
        if (!list) {
            return results;
        }
        Object.entries(list).forEach(([k, v]) => {
            const [, , jobId, type, sub] = k.split('/');
            let job = results.find(j => j.jobId === jobId);
            if (!job) {
                job = { jobId };
                results.push(job);
            }
            if (!job[type]) {
                job[type] = {};
            }
            const value = this.parent._tryParseJSON(v);
            if (sub) {
                job[type][sub] = value;
            }
            else {
                job[type] = value;
            }
        });
        return results.filter(filter);
    }

    async getResults(options) {
        return this._get({ suffix: 'result', jobId: options.jobId });
    }

    async setResults(options) {
        return this._set({ suffix: 'result', data: options.data, jobId: options.jobId });
    }

    async getStatus(options) {
        return this._get({ suffix: 'status', jobId: options.jobId });
    }

    async setStatus(options) {
        return this._set({ suffix: 'status', data: options.data, jobId: options.jobId });
    }

    async getWebhooksResults(options) {
        return this._get({ suffix: 'webhooks/result', jobId: options.jobId });
    }

    async setWebhooksResults(options) {
        return this._set({ suffix: 'webhooks/result', data: options.data, jobId: options.jobId });
    }

    async getWebhooksStatus(options) {
        return this._get({ suffix: 'webhooks/status', jobId: options.jobId });
    }

    async setWebhooksStatus(options) {
        return this._set({ suffix: 'webhooks/status', data: options.data, jobId: options.jobId });
    }

    async watch(options) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        const watch = await this._watch(options);
        watch.watcher.on('put', (res) => {
            const [, , jobId, type] = res.key.toString().split('/');
            const data = this.parent._tryParseJSON(res.value.toString());
            this.emit(`${type}-change`, { jobId, ...data });
        });
        this._watchesMap.set(key, watch.watcher);
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

