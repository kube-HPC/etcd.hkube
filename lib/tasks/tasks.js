const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX, SUFFIX } = require('../consts');
const { getSetTaskSchema, getTasksSchema, watchSchema } = require('./tasks.schemas');
const djsv = require('djsv');
const path = require('path');

class Tasks extends EventEmitter {
    constructor() {
        super();
        this.getTasksSchema = djsv(getTasksSchema);
        this.getSetTaskSchema = djsv(getSetTaskSchema);
        this.watchSchema = djsv(watchSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    async setState(options) {
        const { jobId, taskId, result, status, error } = options;
        return this._set({ jobId, taskId, data: { result, status, error } });
    }

    async getState(options) {
        const { jobId, taskId } = options;
        return this._get({ jobId, taskId });
    }

    async _get(options) {
        let result = null;
        const schema = this.getTasksSchema(options);
        if (schema.valid) {
            const { jobId, taskId } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            result = await this._client.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _getList(options) {
        let result = null;
        const schema = this.getTasksSchema(options);
        if (schema.valid) {
            const { jobId, taskId } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            result = await this._client.get(_path);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.getSetTaskSchema(options);
        if (schema.valid) {
            const { jobId, taskId, data } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            result = await this._client.put(_path, data, null);
        }
        return result;
    }

    async delete(options) {
        let result = null;
        const schema = this.getTasksSchema(options);
        if (schema.valid) {
            const { jobId } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks);
            result = await this._client.delete(_path, { isPrefix: true });
        }
        return result;
    }

    async list(options) {
        const results = new Map();
        const result = await this._getList(options);
        if (!result) {
            return results;
        }
        Object.entries(result).forEach(([k, v]) => {
            const splitedKey = k.split('/');
            const taskId = splitedKey[splitedKey.length - 1];
            const task = jsonHelper.tryParseJSON(v);
            results.set(taskId, task);
        });
        return results;
    }

    async watch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, taskId } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , jobId, , taskId] = res.key.toString().split('/');
            const data = { ...JSON.parse(res.value.toString()), taskId, jobId };
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
        const { jobId, taskId } = schema.instance;
        const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Tasks;
