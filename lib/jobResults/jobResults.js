const EventEmitter = require('events');
const Watcher = require('../watch/watcher');
const jsonHelper = require('../helper/json');
const { PREFIX } = require('../consts');
const { getSchema, setSchema, deleteSchema } = require('./schema');
const djsv = require('djsv');
const path = require('path');
const LOCK_KEY = `${PREFIX.JOB_RESULTS}/locks`;

class JobResults extends EventEmitter {
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
    }

    async _delete(options) {
        const schema = this._deleteSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.JOB_RESULTS, jobId);
        return this._client.delete(_path);
    }

    async _get(options, settings) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.JOB_RESULTS, jobId);
        let result = await this._client.get(_path, settings);
        if (result) {
            result = { jobId, ...result };
        }
        return result;
    }

    async _set(options) {
        const schema = this._setSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId, data } = schema.instance;
        const _path = path.join('/', PREFIX.JOB_RESULTS, jobId);
        return this._client.put(_path, data, null);
    }

    async list(options) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.JOB_RESULTS, jobId);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => ({ jobId: l.key, ...l.value }));
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

    async singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    async watch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX.JOB_RESULTS, jobId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , job] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            if (options.lock) {
                const result = await this._client.lock(`${LOCK_KEY}/change/${job}`);
                if (result) {
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
                const result = await this._client.lock(`${LOCK_KEY}/delete/${job}`);
                if (result) {
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
        const _path = path.join('/', PREFIX.JOB_RESULTS, jobId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = JobResults;

