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

    async setState(options) {
        const { jobId, taskId, result, status, error } = options;
        return await this._set({ jobId, taskId, data: { result, status, error } });
    }

    async getState(options) {
        const { jobId, taskId } = options;
        const result = await this._get({ jobId, taskId });
        return this.parent._tryParseJSON(result.value);
    }

    _get(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.getTasksSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, taskId, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
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
        const schemaInstance = this.getSetTaskSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            const { jobId, taskId, data } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errors[0].stack);
        }
    }

    async list(options) {
        try {
            const results = new Map();
            const result = await this._get(options);
            if (!result.nodes) {
                return results;
            }
            result.nodes.forEach(node => {
                const taskId = node.key.substr(node.key.indexOf('/tasks') + 7);
                const task = this.parent._tryParseJSON(node.value);
                results.set(taskId, task);
            });
            return results;
        }
        catch (error) {
            throw error;
        }

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

    async onStateChange(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const obj = {
            jobId: options.jobId,
            taskId: options.taskId
        }
        const watch = await this._watch(obj);
        watch.watcher.on('change', res => {
            callback(this.parent._tryParseJSON(res.node.value));
        });
    }
}

module.exports = tasks;
