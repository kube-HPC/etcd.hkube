const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const Locker = require('../locks/locker');
const jsonHelper = require('../helper/json');
const PREFIX = require('../consts').PREFIX.JOB_STATUS;
const { getSchema, setSchema, deleteSchema } = require('./schema');

class JobStatus extends EventEmitter {
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

    async _get(options, settings) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
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
        const _path = path.join('/', PREFIX, jobId);
        return this._client.put(_path, data, null);
    }

    async list(options) {
        const schema = this._getSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { jobId } = schema.instance;
        const _path = path.join('/', PREFIX, jobId);
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

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    async getExecutionsTree(options) {
        const res = await this._get({ jobId: options.jobId }, { isPrefix: true });
        if (Object.keys(res).length === 0) return null;
        return this._parseTree(res);
    }

    _parseTree(res) {
        const result = [];
        const m = new Set();
        Object.keys(res).forEach((p) => {
            const s = p.split('.').map(x => x.replace('/' + PREFIX + '/', ''));
            let jobId = s[0] + '.';
            for (let i = 1; i < s.length; i += 1) {
                jobId = jobId + s[i] + '.';
                if (!m.has(jobId)) {
                    result.push({ name: s[i], parent: i === 1 ? 0 : s[i - 1], jobId: jobId.substring(0, jobId.length - 1) });
                    m.add(jobId);
                }
            }
        });
        return this._getNestedChildren(result, 0);
    }

    _getNestedChildren(arr, parent) {
        const out = [];
        for (let i = 0; i < arr.length; i += 1) {
            if (arr[i].parent === parent) {
                const children = this._getNestedChildren(arr, arr[i].name); // should not stop if parent found we want to check deep for each children

                if (children.length) { // if parent found add childrens
                    arr[i].children = children;
                }
                delete arr[i].parent;
                out.push(arr[i]);
            }
        }
        return out;
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

module.exports = JobStatus;

