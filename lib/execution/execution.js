const { PREFIX, SUFFIX } = require('../consts');
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

    async  _get(options) {
        const result = this.getJobSchema(options);
        if (result.valid) {
            const { jobId, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            return await this.etcd.get(_path, { isPrefix: false });
        }
    }

    async _set(options) {
        const result = this.jobResultsSchema(options);
        if (result.valid) {
            const { jobId, data } = result.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            return await this.etcd.put(_path, data, null);
        }
        else {
            throw new Error(result.error);
        }
    }

    async getExecution(options) {
        const result = await this._get({ jobId: options.jobId });
        if (!result) {
            return null;
        }
        return result;
    }

    async setExecution(options) {
        return await this._set({ data: options.data, jobId: options.jobId });
    }
}

module.exports = execution;
