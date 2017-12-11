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
        this.etcd = this.parent.etcd3
    }

    async setState(options) {
        const { jobId, taskId, result, status, error } = options;
        return await this._set({ jobId, taskId, data: { result, status, error } });
    }

    async getState(options) {
        const { jobId, taskId } = options;
        return await this._get({ jobId, taskId });
        //return this.parent._tryParseJSON(result.value);
    }

    async _get(options) {
        const result = this.getTasksSchema(options);
        if (result.valid) {
            const { jobId, taskId, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            return await this.etcd.get(_path, { isPrefix: false });
        }
    }

    async _getList(options) {
        const result = this.getTasksSchema(options);
        if (result.valid) {
            const { jobId, taskId, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            return await this.etcd.get(_path);
        }
    }
    async _set(options) {
        const result = this.getSetTaskSchema(options);
        if (result.valid) {
            const { jobId, taskId, data } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            return await this.etcd.put(_path, data, null);
        }

    }

    async list(options) {
        try {
            const results = new Map();
            const result = await this._getList(options);
            if (!result) {
                return results;
            }
            Object.entries(result).map(([k, v]) => {
                let splitedKey = k.split(`/`);
                const taskId = splitedKey[splitedKey.length - 1];
                const task = this.parent._tryParseJSON(v);
                results.set(taskId, task);
            });
            return results;
        }
        catch (error) {
            throw error;
        }

    }

    async _watch(options) {
        const result = this.watchSchema(options);
        if (result.valid) {
            const { jobId, taskId, index, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, taskId);
            return await this.etcd.getAndWatch(_path, { isPrefix: false })
        }
    }



    async watch(options) {
        options = options || {};
        const key = this._createKey(options);
        if (this._watchesMap.has(key)) {
            throw new Error(`already watching ${JSON.stringify(options)}`);
        }
        options.suffix = 'state';
        const watch = await this._watch(options);
        watch.watcher.on('put', res => {
            // const value = this.parent._tryParseJSON(res.value.toString());
            const data = { ...res, jobId: options.jobId }

            this.emit('change', data);
        });
        this._watchesMap.set(key, watch.watcher);
        return watch.data;
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
                // watcher.on('put', (data) => {
                //     console.log('bla', data);
                // });
                watcher.on('end', (data) => {
                    return res(data);
                });
                // watcher.stop();
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
