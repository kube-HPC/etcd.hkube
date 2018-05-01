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

    async _get(options, settings) {
        let result = null;
        const schema = this.getJobSchema(options);
        if (schema.valid) {
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.EXECUTIONS, jobId);
            result = await this._client.get(_path, settings);
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
        return this._get({ jobId: options.jobId }, { isPrefix: false });
    }

    async setExecution(options) {
        return this._set({ data: options.data, jobId: options.jobId });
    }

    async getExecutionsTree(options) {
        const res = await this._get({ jobId: options.jobId }, { isPrefix: true });
        if (Object.keys(res).length === 0) return null;
        return this._parseTree(res);
    }

    _parseTree(res) {
        const result = [];
        const m = new Set();
        Object.keys(res).forEach((p) => {
            const s = p.split('.').map(x => x.replace('/' + PREFIX.EXECUTIONS + '/', ''));
            let jobId = s[0] + '.';
            for (let i = 1; i < s.length; i += 1) {
                jobId = jobId + s[i] + '.';
                if (!m.has(jobId)) {
                    result.push({ name: s[i], parent: i === 1 ? 0 : s[i - 1], jobId: jobId.substring(0, jobId.length - 1) });
                    m.add(jobId);
                }
            }
        });
        return this._getNestedChildren(result, 0);
    }

    _getNestedChildren(arr, parent) {
        const out = [];
        for (let i = 0; i < arr.length; i += 1) {
            if (arr[i].parent === parent) {
                const children = this._getNestedChildren(arr, arr[i].name); // should not stop if parent found we want to check deep for each children

                if (children.length) { // if parent found add childrens
                    arr[i].children = children;
                }
                delete arr[i].parent;
                out.push(arr[i]);
            }
        }
        return out;
    }
}

module.exports = Execution;
