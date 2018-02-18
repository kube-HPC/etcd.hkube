const { PREFIX } = require('../consts');
const Watcher = require('../watch/watcher');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./execution.schemas');
const djsv = require('djsv');
const path = require('path');

class Execution {
    constructor() {
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
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            result = await this._client.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _set(options) {
        const result = this.jobResultsSchema(options);
        if (result.valid) {
            const { jobId, data } = result.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            return this._client.put(_path, data, null);
        }

        throw new Error(result.error);
    }

    async getExecution(options) {
        return this._get({ jobId: options.jobId });
    }

    async setExecution(options) {
        return this._set({ data: options.data, jobId: options.jobId });
    }
}

module.exports = Execution;
