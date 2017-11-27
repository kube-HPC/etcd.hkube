const EventEmitter = require('events');
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
        this._watchesMap = new Map();
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
            const result = this.getTasksSchema(options);
            if (result.valid) {
                const { jobId, taskId, etcdOptions } = result.instance;
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
                return rej(new Error(result.error));
            }
        });
    }

    async _set(options) {
        const result = this.getSetTaskSchema(options);
        if (result.valid) {
            const { jobId, taskId, data } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            return await this.parent._keyRegister(_path, null, data);
        }
        else {
            throw new Error(result.error);
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
            const result = this.watchSchema(options);
            if (result.valid) {
                const { jobId, taskId, index, etcdOptions } = result.instance;
                const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
                this.parent.etcd.get(_path, {}, (err, obj) => {
                    const watcher = this.parent.etcd.watcher(_path, index, etcdOptions);
                    if (err) {
                        if (err.errorCode == 100) {
                            return res({ obj: {}, watcher });
                        }
                        return rej(err)
                    }
                    return res({ obj: this.parent._tryParseJSON(obj.node.value), watcher });
                });
            }
            else {
                return rej(new Error(result.error));
            }
        });
    }

    async watch(options) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        const watch = await this._watch(options);
        watch.watcher.on('set', res => {
            const value = this.parent._tryParseJSON(res.node.value);
            const data = Object.assign({}, value, { jobId: options.jobId, taskId: options.taskId });
            this.emit('change', data);
        });
        this._watchesMap.set(key, watch.watcher);
        return watch.obj;
    }

    async unwatch(options) {
        options = options || {};
        return await this._unwatch(options);
    }

    _unwatch(options) {
        return new Promise((res, rej) => {
            const result = this.watchSchema(options);
            if (result.valid) {
                const key = this._createKey(result.instance);
                const watcher = this._watchesMap.get(key);
                if (!watcher) {
                    return rej(new Error(`unable to find watcher for ${JSON.stringify(options)}`));
                }
                watcher.on('stop', (data) => {
                    return res(data);
                });
                watcher.stop();
                this._watchesMap.delete(key);
            }
            else {
                return rej(new Error(result.error));
            }
        });
    }

    _createKey({ jobId, taskId }) {
        return [jobId, taskId].join(':');
    }

}

module.exports = Tasks;
