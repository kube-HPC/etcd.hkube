const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const Locker = require('../locks/locker');
const jsonHelper = require('../helper/json');
const PREFIX = require('../consts').PREFIX.JOBS;
const { jobsSchema } = require('./jobs.schemas');

class Jobs extends EventEmitter {
    constructor() {
        super();
        this.schema = djsv(jobsSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
        this._locker = new Locker(options.client, { prefix: PREFIX });
    }

    async _get(options) {
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX, suffix, jobId);
        return this._client.get(_path, { isPrefix: false });
    }

    async _set(options) {
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, data, suffix } = schema.instance;
        const _path = path.join('/', PREFIX, jobId, suffix);
        return this._client.put(_path, data);
    }

    async getState(options) {
        return this._get({ jobId: options.jobId });
    }

    async setState(options) {
        return this._set({ data: { state: options.state }, jobId: options.jobId });
    }

    async stop(options) {
        return this._set({ data: { state: 'stop', reason: options.reason }, jobId: options.jobId });
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    releaseChangeLock(jobId) {
        this._locker.release('change', [jobId]);
    }

    releaseDeleteLock(jobId) {
        this._locker.release('delete', [jobId]);
    }

    async watch(options) {
        options = options || {};
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX, jobId, suffix);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , job] = res.key.toString().split('/');
            const value = jsonHelper.tryParseJSON(res.value.toString());
            if (options.lock) {
                const lock = await this._locker.acquire('change', [job, suffix]);
                if (lock) {
                    this.emit('change', { ...value, jobId: job });
                }
            }
            else {
                this.emit('change', { ...value, jobId: job });
            }
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.schema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, suffix } = schema.instance;
        const _path = path.join('/', PREFIX, jobId, suffix);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Jobs;
