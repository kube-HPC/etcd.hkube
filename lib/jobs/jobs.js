const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./jobs.schemas');
const djsv = require('djsv');
const path = require('path');

class Jobs extends EventEmitter {
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
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            result = await this._client.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.jobResultsSchema(options);
        if (schema.valid) {
            const { jobId, data, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            result = await this._client.put(_path, data);
        }
        return result;
    }

    async getState(options) {
        return this._get({ suffix: 'state', jobId: options.jobId });
    }

    async setState(options) {
        return this._set({ suffix: 'state', data: { state: options.state }, jobId: options.jobId });
    }

    async stop(options) {
        return this._set({ suffix: 'state', data: { state: 'stop', reason: options.reason }, jobId: options.jobId });
    }

    async watch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , jobId] = res.key.toString().split('/');
            const value = jsonHelper.tryParseJSON(res.value.toString());
            const data = { ...value, jobId };
            this.emit('change', data);
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Jobs;
