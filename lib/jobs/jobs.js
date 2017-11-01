const { PREFIX, SUFFIX } = require('../consts');
const { getSetTaskSchema, getTasksSchema, watchSchema, jobResultsSchema } = require('./jobs.schemas');
const djsv = require('djsv');
const path = require('path');

class jobs {
    constructor() {
        this.getTasksSchema = djsv(getTasksSchema);
        this.getSetTaskSchema = djsv(getSetTaskSchema);
        this.watchSchema = djsv(watchSchema);
        this.jobResultsSchema = djsv(jobResultsSchema);
    }

    init(parent) {
        this.parent = parent;
    }

    async setTaskStatus(data) {
        const { jobId, taskId } = this.parent;
        return await this._setTask({ suffix: 'status', jobId, taskId, data });
    }

    async setTaskResult(data) {
        const { jobId, taskId } = this.parent;
        return await this._setTask({ suffix: 'result', jobId, taskId, data });
    }

    async getTaskStatus(data) {
        const { jobId, taskId } = this.parent;
        return await this._getTasks({ suffix: 'status', jobId, taskId });
    }

    async getTaskResult(data) {
        const { jobId, taskId } = this.parent;
        return await this._getTasks({ suffix: 'result', jobId, taskId });
    }

    _getTasks(options) {
        return new Promise((res, rej) => {
            const schemaInstance = this.getTasksSchema(options, { ignoreNull: true });
            if (schemaInstance.valid) {
                const { jobId, taskId, suffix, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId, suffix);
                this.parent.etcd.get(_path, etcdOptions, (err, obj) => {
                    if (err) {
                        return rej(err)
                    }
                    return res(obj)
                });
            } else {
                return rej(new Error(schemaInstance.errorDescription));
            }
        });
    }

    async _setTask(options) {
        const schemaInstance = this.getSetTaskSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            const { jobId, taskId, suffix, data } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId, suffix);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errorDescription);
        }
    }

    async getJobsTasks() {
        let results = null;
        try {
            const { jobId } = this.parent;
            const result = await this._getTasks({ jobId });
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
                const { jobId, taskId, prefix, subfix, suffix, index, etcdOptions } = schemaInstance.instance;
                const _path = path.join('/', prefix, jobId, subfix, taskId, suffix);
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
                return rej(new Error(schemaInstance.errorDescription));
            }
        });
    }

    async setJobResults(options) {
        const schemaInstance = this.jobResultsSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            const { jobId } = this.parent;
            const { data } = schemaInstance.instance;
            const _path = path.join('/', PREFIX.JOBS, 'jobResults', jobId, 'result');
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(schemaInstance.errorDescription);
        }
    }

    async onTaskResult(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const obj = {
            prefix: PREFIX.JOBS,
            subfix: SUFFIX.tasks,
            suffix: 'result',
            jobId: options.jobId || this.parent.jobId,
            taskId: options.taskId
        }
        const watch = await this._watch(obj);
        watch.watcher.on('change', res => {
            callback(JSON.parse(res.node.value));
        });
    }

    async onJobResult(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const obj = {
            prefix: PREFIX.JOBS,
            subfix: 'jobResults',
            jobId: options.jobId
        }
        const watch = await this._watch(obj);
        watch.watcher.on('change', res => {
            const jobId = res.node.key.split('/')[3];
            const result = JSON.parse(res.node.value);
            callback({ jobId, result });
        });
    }
}

module.exports = jobs;
