const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { JOBS, TASKS } = require('../consts').PREFIX;
const { getSetTaskSchema, getTasksSchema, watchSchema } = require('./tasks.schemas');

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
        const { jobId, taskId, ...data } = options;
        return this._set({ jobId, taskId, data });
    }

    async getState(options) {
        const { jobId, taskId } = options;
        return this._get({ jobId, taskId }, { isPrefix: false });
    }

    async _get(options, settings) {
        const schema = this.getTasksSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, taskId } = schema.instance;
        const _path = path.join('/', JOBS, TASKS, jobId, taskId);
        return this._client.get(_path, settings);
    }

    async _set(options) {
        const schema = this.getSetTaskSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, taskId, data } = schema.instance;
        const _path = path.join('/', JOBS, TASKS, jobId, taskId);
        return this._client.put(_path, data, null);
    }

    async delete(options) {
        const schema = this.getTasksSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', JOBS, TASKS, jobId);
        return this._client.delete(_path, { isPrefix: true });
    }

    async list(options) {
        const results = new Map();
        const result = await this._get(options, { isPrefix: true });
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
        const _path = path.join('/', JOBS, TASKS, jobId, taskId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , , job, task] = res.key.toString().split('/');
            const data = { ...jsonHelper.tryParseJSON(res.value.toString()), taskId: task, jobId: job };
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
        const _path = path.join('/', JOBS, TASKS, jobId, taskId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Tasks;
