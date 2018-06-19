const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const Locker = require('../locks/locker');
const jsonHelper = require('../helper/json');
const PREFIX = require('../consts').PREFIX.PIPELINE_DRIVER_REQUIREMENTS;
const { getSchema, setSchema, deleteSchema } = require('./schema');

class PipelineDriverRequirements extends EventEmitter {
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
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX, name);
        return this._client.delete(_path);
    }

    async _get(options, settings) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX, name);
        return this._client.get(_path, settings);
    }

    async _set(options) {
        const schema = this._setSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name, data } = schema.instance;
        const _path = path.join('/', PREFIX, name);
        return this._client.put(_path, data);
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

    async list(options) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX, name);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => l.value);
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
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX, name);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , alg] = res.key.toString().split('/');
            const data = jsonHelper.tryParseJSON(res.value.toString());
            if (options.lock) {
                const lock = await this._locker.acquire('change', [alg]);
                if (lock) {
                    this.emit('change', { name: alg, data });
                }
            }
            else {
                this.emit('change', { name: alg, data });
            }
        });
        watch.watcher.on('delete', async (res) => {
            const [, , alg] = res.key.toString().split('/');
            if (options.lock) {
                const lock = await this._locker.acquire('delete', [alg]);
                if (lock) {
                    this.emit('delete', { name: alg });
                }
            }
            else {
                this.emit('delete', { name: alg });
            }
        });
        return { name, data: watch.data };
    }

    async unwatch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { name } = schema.instance;
        const _path = path.join('/', PREFIX, name);
        return this._watcher.unwatch(_path);
    }
}

module.exports = PipelineDriverRequirements;
