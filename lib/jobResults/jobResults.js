const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
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
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async _get(options) {
        let result = null;
        const schema = this.getJobSchema(options);
        if (schema.valid) {
            const { jobId, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            const data = await this._client.get(_path, { isPrefix: false });
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
            result = await this._client.get(_path);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.jobResultsSchema(options);
        if (schema.valid) {
            const { jobId, data, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBRESULTS, jobId, suffix);
            result = await this._client.put(_path, data, null);
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
            const value = jsonHelper.tryParseJSON(v);
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
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.JOBRESULTS, jobId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , jobId, type] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            this.emit(`${type}-change`, { jobId, ...data });
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.JOBRESULTS, jobId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = JobResults;

