const EventEmitter = require('events');
const djsv = require('djsv');
const { join } = require('path');
const compile = require('string-template/compile');
const Watcher = require('./watch/watcher');
const Locker = require('./locks/locker');
const jsonHelper = require('./helper/json');

class Service extends EventEmitter {
    constructor(options) {
        super();
        this._prefix = options.prefix;
        this._format = compile(options.template);
        this._getSchema = djsv(options.getSchema);
        this._setSchema = djsv(options.setSchema);
        this._deleteSchema = djsv(options.deleteSchema);
        this._watchSchema = djsv(options.watchSchema);
        this._client = options.client;
        this._watcher = new Watcher(options.client);
        this._locker = new Locker(options.client, { prefix: this._prefix });
    }

    format(options) {
        return this._format(options);
    }

    validateGet(options) {
        return this._validateSchema(this._getSchema, options);
    }

    validateSet(options) {
        return this._validateSchema(this._setSchema, options);
    }

    validateDelete(options) {
        return this._validateSchema(this._deleteSchema, options);
    }

    validateWatch(options) {
        return this._validateSchema(this._watchSchema, options);
    }

    _validateSchema(schema, options) {
        const result = schema(options);
        if (!result.valid) {
            throw new Error(result.error);
        }
        return result.instance;
    }

    get(options) {
        this.validateGet(options);
        const path = this.getPath(options);
        return this._client.get(path, { isPrefix: false });
    }

    set(options) {
        this.validateSet(options);
        const path = this.getPath(options);
        return this._client.put(path, options.data);
    }

    delete(options) {
        this.validateDelete(options);
        const path = this.getPath(options);
        return this._client.delete(path);
    }

    getPath(options) {
        const key = this.format(options);
        return join('/', this._prefix, key);
    }

    async list(options) {
        this.validateGet(options);
        const path = this.getPath(options);
        return this._client.getByQuery(path, options);
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    releaseChangeLock(keyProp) {
        const key = join('/', this._prefix, keyProp);
        this._locker.release('change', key);
    }

    releaseDeleteLock(keyProp) {
        const key = join('/', this._prefix, keyProp);
        this._locker.release('delete', key);
    }

    async watch(options) {
        options = options || {};
        this.validateWatch(options);
        const path = this.getPath(options);
        const watch = await this._watcher.watch(path);
        watch.watcher.on('put', async (res) => {
            const key = res.key.toString();
            const data = jsonHelper.tryParseJSON(res.value.toString());
            if (options.lock) {
                const lock = await this._locker.acquire('change', key);
                if (lock) {
                    this.emit('change', data);
                }
            }
            else {
                this.emit('change', data);
            }
        });
        watch.watcher.on('delete', async (res) => {
            const key = res.key.toString();
            const data = jsonHelper.tryParseJSON(res.value.toString());
            if (options.lock) {
                const lock = await this._locker.acquire('delete', key);
                if (lock) {
                    this.emit('delete', data);
                }
            }
            else {
                this.emit('delete', data);
            }
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        this.validateWatch(options);
        const path = this.getPath(options);
        return this._watcher.unwatch(path);
    }
}

module.exports = Service;

