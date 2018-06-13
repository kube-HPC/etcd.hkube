const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { jobsSchema } = require('./jobs.schemas');
const djsv = require('djsv');
const path = require('path');

class Jobs extends EventEmitter {
    constructor() {
        super();
        this.schema = djsv(jobsSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async _get(options) {
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
        return this._client.get(_path, { isPrefix: false });
    }

    async _set(options) {
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, data, suffix } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
        return this._client.put(_path, data);
    }

    async getState(options) {
        return this._get({ jobId: options.jobId });
    }

    async setState(options) {
        return this._set({ data: { state: options.state }, jobId: options.jobId });
    }

    async stop(options) {
        return this._set({ data: { state: 'stop', reason: options.reason }, jobId: options.jobId });
    }

    async watch(options) {
        options = options || {};
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , job] = res.key.toString().split('/');
            const value = jsonHelper.tryParseJSON(res.value.toString());
            this.emit('change', { ...value, jobId: job });
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Jobs;
