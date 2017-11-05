const { PREFIX, SUFFIX } = require('../consts');
const { getSetTaskSchema, getTasksSchema, watchSchema } = require('./tasks.schemas');
const djsv = require('djsv');
const path = require('path');

class tasks {
    constructor() {
        this.getTasksSchema = djsv(getTasksSchema);
        this.getSetTaskSchema = djsv(getSetTaskSchema);
        this.watchSchema = djsv(watchSchema);
    }

    init(parent) {
        this.parent = parent;
    }

    async setStatus(options) {
        const { jobId, taskId, status, error } = options;
        return await this._set({ suffix: 'status', jobId, taskId, data: { status, error } });
    }

    async setResult(options) {
        const { jobId, taskId, result } = options;
        return await this._set({ suffix: 'result', jobId, taskId, data: result });
    }

    async getStatus(options) {
        const { jobId, taskId } = options;
        return await this._get({ suffix: 'status', jobId, taskId });
    }

    async getResult(options) {
        const { jobId, taskId } = options;
        return await this._get({ suffix: 'result', jobId, taskId });
    }

    _get(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.getTasksSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, taskId, suffix, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId, suffix);
                this.parent.etcd.get(_path, etcdOptions, (err, obj) => {
                    if (err) {
                        return rej(err)
                    }
                    return res(this.parent._tryParseJSON(obj.node.value));
                });
            } else {
                return rej(new Error(schemaInstance.errors[0].stack));
            }
        });
    }

    async _set(options) {
        const schemaInstance = this.getSetTaskSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            const { jobId, taskId, suffix, data } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId, suffix);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errors[0].stack);
        }
    }

    async list(options) {
        let results = null;
        try {
            const result = await this._get(options);
            results = new Map();
            result.node.nodes.forEach(node => {
                const taskId = node.key.substr(node.key.indexOf('/tasks') + 7);
                const task = Object.create(null);
                node.nodes.forEach(n => {
                    const key = n.key.substr(n.key.lastIndexOf('/') + 1);
                    task[key] = this.parent._tryParseJSON(n.value);
                });
                results.set(taskId, task);
            });
        }
        catch (error) {
            if (error.errorCode === 100) {
                return null;
            }
            throw error;
        }
        return results;
    }

    _watch(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.watchSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, taskId, suffix, index, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId, suffix);
                this.parent.etcd.get(_path, {}, (err, obj) => {
                    const watcher = this.parent.etcd.watcher(_path, index, etcdOptions);
                    if (err) {
                        if (err.errorCode == 100) {
                            return res({ obj: {}, watcher });
                        } else {
                            return rej(err)
                        }
                    }
                    return res({ obj, watcher });
                });
            }
            else {
                return rej(new Error(schemaInstance.errors[0].stack));
            }
        });
    }

    async onResult(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const obj = {
            suffix: 'result',
            jobId: options.jobId,
            taskId: options.taskId
        }
        const watch = await this._watch(obj);
        watch.watcher.on('change', res => {
            callback(this.parent._tryParseJSON(res.node.value));
        });
    }

    async onStatus(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const obj = {
            suffix: 'status',
            jobId: options.jobId || this.parent.jobId,
            taskId: options.taskId
        }
        const watch = await this._watch(obj);
        watch.watcher.on('change', res => {
            callback(this.parent._tryParseJSON(res.node.value));
        });
    }
}

module.exports = tasks;
