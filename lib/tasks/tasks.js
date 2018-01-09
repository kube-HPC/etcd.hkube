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
        this.etcd = this.parent.etcd3;
    }

    async setState(options) {
        const {
            jobId, taskId, result, status, error
        } = options;
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
            result = await this.etcd.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _getList(options) {
        let result = null;
        const schema = this.getTasksSchema(options);
        if (schema.valid) {
            const { jobId, taskId } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            result = await this.etcd.get(_path);
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.getSetTaskSchema(options);
        if (schema.valid) {
            const { jobId, taskId, data } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            result = await this.etcd.put(_path, data, null);
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
            const task = this.parent._tryParseJSON(v);
            results.set(taskId, task);
        });
        return results;
    }

    async _watch(options) {
        let result = null;
        const schema = this.watchSchema(options);
        if (schema.valid) {
            const {
                jobId, taskId
            } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            result = await this.etcd.getAndWatch(_path, { isPrefix: false });
        }
        return result;
    }

    async watch(options) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        options.suffix = 'state';
        const watch = await this._watch(options);
        watch.watcher.on('put', (res) => {
            const [, , jobId, , taskId] = res.key.toString().split('/');
            const data = { ...JSON.parse(res.value.toString()), taskId, jobId };
            this.emit('change', data);
        });
        this._watchesMap.set(key, watch.watcher);
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        return this._unwatch(options);
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
                watcher.on('end', (data) => {
                    return res(data);
                });
                watcher.cancel();
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
