const { PREFIX } = require('../consts');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./execution.schemas');
const djsv = require('djsv');
const path = require('path');

class execution {
    constructor() {
        this.watchSchema = djsv(watchSchema);
        this.jobResultsSchema = djsv(jobResultsSchema);
        this.getJobSchema = djsv(getJobSchema);
    }

    init(parent) {
        this.parent = parent;
        this.etcd = this.parent.etcd3;
    }

    async _get(options) {
        let result = null;
        const schema = this.getJobSchema(options);
        if (schema.valid) {
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            result = await this.etcd.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _set(options) {
        const result = this.jobResultsSchema(options);
        if (result.valid) {
            const { jobId, data } = result.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            return this.etcd.put(_path, data, null);
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

module.exports = execution;
