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
    }

    _get(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.getJobSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
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
            const { jobId, data } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errors[0].stack);
        }
    }

    async getExecution(options) {
        const result = await this._get({ jobId: options.jobId });
        return this.parent._tryParseJSON(result.value);
    }

    async setExecution(options) {
        return await this._set({ data: options.data, jobId: options.jobId });
    }
}

module.exports = execution;
