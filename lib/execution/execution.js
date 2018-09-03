const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const PREFIX = require('../consts').PREFIX.EXECUTIONS;
const Watcher = require('../watch/watcher');
const Locker = require('../locks/locker');
const jsonHelper = require('../helper/json');
const { getSchema, setSchema, deleteSchema } = require('./schema');

class Execution extends EventEmitter {
    constructor() {
        super();
        this._getSchema = djsv(getSchema);
        this._setSchema = djsv(setSchema);
        this._deleteSchema = djsv(deleteSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
        this._locker = new Locker(options.client, { prefix: PREFIX });
    }

    async _delete(options) {
        const schema = this._deleteSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
        return this._client.delete(_path);
    }

    async list(options) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => ({ ...l.value, jobId: l.key }));
    }

    async _get(options, settings) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
        return this._client.get(_path, settings);
    }

    async _set(options) {
        const schema = this._setSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, data } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
        return this._client.put(_path, data, null);
    }

    get(options) {
        return this._get(options, { isPrefix: false });
    }

    set(options) {
        return this._set(options);
    }

    delete(options) {
        return this._delete(options);
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
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , job] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            if (options.lock) {
                const lock = await this._locker.acquire('change', [job]);
                if (lock) {
                    this.emit('change', { jobId: job, ...data });
                }
            }
            else {
                this.emit('change', { jobId: job, ...data });
            }
        });
        watch.watcher.on('delete', async (res) => {
            const [, , job] = res.key.toString().split('/');
            if (options.lock) {
                const lock = await this._locker.acquire('delete', [job]);
                if (lock) {
                    this.emit('delete', { jobId: job });
                }
            }
            else {
                this.emit('delete', { jobId: job });
            }
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = Execution;
