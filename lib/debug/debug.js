const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const Locker = require('../locks/locker');
const jsonHelper = require('../helper/json');
const PREFIX = require('../consts').PREFIX.ALGORITHM_DEBUG;
const { getSchema, setSchema, deleteSchema } = require('./schema');

class DebugAlgorithm extends EventEmitter {
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
        const { algorithmName } = schema.instance;
        const _path = path.join('/', PREFIX, algorithmName);
        return this._client.delete(_path);
    }

    async _get(options, settings) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { algorithmName } = schema.instance;
        const _path = path.join('/', PREFIX, algorithmName);
        let result = await this._client.get(_path, settings);
        if (result) {
            result = { algorithmName, ...result };
        }
        return result;
    }

    async _set(options) {
        const schema = this._setSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { algorithmName, data } = schema.instance;
        const _path = path.join('/', PREFIX, algorithmName);
        return this._client.put(_path, data, null);
    }

    async list(options) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { algorithmName } = schema.instance;
        const _path = path.join('/', PREFIX, algorithmName);
        const list = await this._client.getByQuery(_path, options);
        return list.map(l => ({ algorithmName: l.key, ...l.value }));
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

    releaseChangeLock(algorithmName) {
        this._locker.release('change', [algorithmName]);
    }

    releaseDeleteLock(algorithmName) {
        this._locker.release('delete', [algorithmName]);
    }

    async watch(options) {
        options = options || {};
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { algorithmName } = schema.instance;
        const _path = path.join('/', PREFIX, algorithmName);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , algorithmName] = res.key.toString().split('/'); //eslint-disable-line
            const data = jsonHelper.tryParseJSON(res.value.toString()); 
            if (options.lock) {
                const lock = await this._locker.acquire('change', [algorithmName]);
                if (lock) {
                    this.emit('change', { algorithmName, ...data }); 
                }
            }
            else {
                this.emit('change', { algorithmName, ...data });
            }
        });
        watch.watcher.on('delete', async (res) => {
            const [, , algorithmName] = res.key.toString().split('/'); //eslint-disable-line
            if (options.lock) {
                const lock = await this._locker.acquire('delete', [algorithmName]);
                if (lock) {
                    this.emit('delete', { algorithmName });
                }
            }
            else {
                this.emit('delete', { algorithmName });
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
        const { algorithmName } = schema.instance;
        const _path = path.join('/', PREFIX, algorithmName);
        return this._watcher.unwatch(_path);
    }
}

module.exports = DebugAlgorithm;

