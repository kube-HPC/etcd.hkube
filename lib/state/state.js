const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const Locker = require('../locks/locker');
const jsonHelper = require('../helper/json');
const { JOBS, STATE } = require('../consts').PREFIX;
const { getSetStateSchema, getStateSchema, watchSchema } = require('./state.schemas');

class State extends EventEmitter {
    constructor() {
        super();
        this.getStateSchema = djsv(getStateSchema);
        this.getSetStateSchema = djsv(getSetStateSchema);
        this.watchSchema = djsv(watchSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
        this._locker = new Locker(options.client, {
            prefix: `/${JOBS}/${STATE}`
        });
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
    // async getState(options) {
    //     return this._get({ jobId: options.jobId });
    // }

    async setState(options) {
        return this._set({ data: { state: options.state }, jobId: options.jobId });
    }
    // async setState(options) {
    //     const { jobId, result, status, error } = options;
    //     return this._set({ jobId, data: { result, status, error } });
    // }

    async getState(options) {
        const { jobId } = options;
        return this._get({ jobId }, { isPrefix: false });
    }

    async _get(options, settings) {
        const schema = this.getStateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', JOBS, STATE, jobId);
        return this._client.get(_path, settings);
    }

    async _set(options) {
        const schema = this.getSetStateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, data } = schema.instance;
        const _path = path.join('/', JOBS, STATE, jobId);
        return this._client.put(_path, data, null);
    }

    async delete(options) {
        const schema = this.getStateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', JOBS, STATE, jobId);
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
            const jobId = splitedKey[splitedKey.length - 1];
            const state = jsonHelper.tryParseJSON(v);
            results.set(jobId, state);
        });
        return results;
    }

    async watch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', JOBS, STATE, jobId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , , job] = res.key.toString().split('/');
            const data = { ...jsonHelper.tryParseJSON(res.value.toString()), jobId: job };
            if (options.lock) {
                const lock = await this._locker.acquire('change', [job, STATE]);
                if (lock) {
                    this.emit('change', data);
                }
            }
            else {
                this.emit('change', data);
            }
        });
        return watch.data;
    }
    async stop(options) {
        return this._set({ data: { state: 'stop', reason: options.reason }, jobId: options.jobId });
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', JOBS, STATE, jobId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = State;
