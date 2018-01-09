const EventEmitter = require('events');
const { PREFIX } = require('../consts');
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
        let result = null;
        const schema = this.watchSchema(options);
        if (schema.valid) {
            const {
                jobId, suffix
            } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            result = await this.etcd.getAndWatch(_path, { isPrefix: false });
        }
        return result;
    }

    async _get(options) {
        let result = null;
        const schema = this.getJobSchema(options);
        if (schema.valid) {
            const { jobId, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            result = await this.etcd.get(_path, { isPrefix: false });
        }
        return result;
    }

    async _set(options) {
        let result = null;
        const schema = this.jobResultsSchema(options);
        if (schema.valid) {
            const { jobId, data, suffix } = schema.instance;
            const _path = path.join('/', PREFIX.JOBS, jobId, suffix);
            result = await this.etcd.put(_path, data);
        }
        return result;
    }

    async getState(options) {
        return this._get({ suffix: 'state', jobId: options.jobId });
    }

    async setState(options) {
        return this._set({ suffix: 'state', data: { state: options.state }, jobId: options.jobId });
    }

    async stop(options) {
        return this._set({ suffix: 'state', data: { state: 'stop', reason: options.reason }, jobId: options.jobId });
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
            const value = this.parent._tryParseJSON(res.value.toString());
            const data = Object.assign({}, value, { jobId: options.jobId });
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
                const key = this._createKey(options);
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
