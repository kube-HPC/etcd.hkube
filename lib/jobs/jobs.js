const EventEmitter = require('events');
const { PREFIX, SUFFIX } = require('../consts');
const { getJobSchema, watchSchema, jobResultsSchema } = require('./jobs.schemas');
const djsv = require('djsv');
const path = require('path');

class Jobs extends EventEmitter {
    constructor() {
        super();
        this.watchSchema = djsv(watchSchema);
        this.jobResultsSchema = djsv(jobResultsSchema);
        this.getJobSchema = djsv(getJobSchema);
        this._watchesMap = new Map();
    }

    init(parent) {
        this.parent = parent;
        this.etcd = parent.etcd3;
    }

    async _watch(options) {
        const result = this.watchSchema(options);
        if (result.valid) {
            const { jobId, suffix, index, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            return await this.etcd.getAndWatch(_path);
        }
    }
    async _get(options) {
        const result = this.getJobSchema(options);
        if (result.valid) {
            const { jobId, suffix, etcdOptions } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            return await this.etcd.get(_path, { isPrefix: false })
        }
    }

    async _set(options) {
        const result = this.jobResultsSchema(options);
        if (result.valid) {
            const { jobId, data, suffix } = result.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            return await this.etcd.put(_path, data);
        }
        else {
            throw new Error(result.error);
        }
    }

    async getState(options) {
        return await this._get({ suffix: 'state', jobId: options.jobId });
    }

    async setState(options) {
        return await this._set({ suffix: 'state', data: { state: options.state }, jobId: options.jobId });
    }

    async stop(options) {
        return await this._set({ suffix: 'state', data: { state: 'stop', reason: options.reason }, jobId: options.jobId });
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
            const value = this.parent._tryParseJSON(res.value.toString());
            const data = Object.assign({}, value, { jobId: options.jobId });
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

    _createKey({ jobId }) {
        return [jobId].join(':');
    }
}

module.exports = Jobs;
