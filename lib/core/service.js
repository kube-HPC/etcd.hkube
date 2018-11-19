const EventEmitter = require('events');
const validator = require('../validation/validator');
const compile = require('string-template/compile');
const jsonHelper = require('../helper/json');
const watchTypes = require('../consts/watch-types');

const CURLY_REGEX = /\{([0-9a-zA-Z]+)\}/;

class Service extends EventEmitter {
    constructor(options) {
        super();
        this._template = options.template;
        this._templateValues = this._template.split('/');
        this._format = compile(options.template);
        this._getSchema = validator.compile(options.getSchema);
        this._setSchema = validator.compile(options.setSchema);
        this._deleteSchema = validator.compile(options.deleteSchema);
        this._watchSchema = validator.compile(options.watchSchema);
        this._client = options.client;
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

    _validateSchema(schema, object) {
        return validator.validate(schema, object);
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
        let format = this._format(options);
        if (format.charAt(format.length - 1) === '/') {
            format = format.substr(0, format.length - 1);
        }
        return format;
    }

    async list(options) {
        this.validateGet(options);
        const path = this.getPath(options);
        const list = await this._client.getByQuery(path, options);
        const results = [];
        Object.entries(list).forEach(([k, v]) => {
            const object = this._keyToObject(k);
            const value = jsonHelper.tryParseJSON(v);
            results.push({ ...object, value });
        });
        return results;
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    releaseChangeLock(options) {
        const key = this.getPath(options);
        this._client.locker.release(watchTypes.CHANGE, key);
    }

    releaseDeleteLock(options) {
        const key = this.getPath(options);
        this._client.locker.release(watchTypes.DELETE, key);
    }

    async watch(option) {
        const options = option || {};
        this.validateWatch(options);
        const path = this.getPath(options);
        const watch = await this._client.watcher.watch(path);
        watch.watcher.on('put', (res) => {
            this._handleWatch(watchTypes.CHANGE, res, options.lock);
        });
        watch.watcher.on('delete', async (res) => {
            this._handleWatch(watchTypes.DELETE, res, options.lock);
        });
        return watch.data;
    }

    async _handleWatch(event, res, isLock) {
        const key = res.key.toString();
        const data = jsonHelper.tryParseJSON(res.value.toString());
        const object = this._keyToObject(key);
        if (isLock) {
            const lock = await this._client.locker.acquire(event, key);
            if (lock) {
                this.emit(event, { ...object, data });
            }
        }
        else {
            this.emit(event, { ...object, data });
        }
    }

    _keyToObject(key) {
        const values = key.split('/');
        const result = {};

        this._templateValues.forEach((r, i) => {
            const template = CURLY_REGEX.exec(r);
            if (template) {
                const k = template[1];
                const v = values[i];
                result[k] = v;
            }
        });
        return result;
    }

    async unwatch(option) {
        const options = option || {};
        this.validateWatch(options);
        const path = this.getPath(options);
        return this._client.watcher.unwatch(path);
    }
}

module.exports = Service;

