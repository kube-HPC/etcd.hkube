const EventEmitter = require('events');
const djsv = require('djsv');
const path = require('path');
const Watcher = require('../watch/watcher');
const Locker = require('../locks/locker');
const jsonHelper = require('../helper/json');
const PREFIX = require('../consts').PREFIX.ALGORITHM_EXECUTIONS;
const { stateSchema } = require('./state.schemas');

class AlgorithmExecutions extends EventEmitter {
    constructor() {
        super();
        this.stateSchema = djsv(stateSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
        this._locker = new Locker(options.client, { prefix: PREFIX });
    }

    async setState(options) {
        return this._set({ data: { state: options.state }, execId: options.execId });
    }

    async getState(options) {
        const { execId } = options;
        return this._get({ execId }, { isPrefix: false });
    }

    async _get(options, settings) {
        const schema = this.stateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { execId } = schema.instance;
        const _path = path.join('/', PREFIX, execId);
        return this._client.get(_path, settings);
    }

    async _set(options) {
        const schema = this.stateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { execId, data } = schema.instance;
        const _path = path.join('/', PREFIX, execId);
        return this._client.put(_path, data, null);
    }

    async delete(options) {
        const schema = this.stateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { execId } = schema.instance;
        const _path = path.join('/', PREFIX, execId);
        return this._client.delete(_path, { isPrefix: true });
    }

    async stop(options) {
        return this._set({ data: { state: 'stop', reason: options.reason }, execId: options.execId });
    }

    async watch(options) {
        options = options || {};
        const schema = this.stateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { execId } = schema.instance;
        const _path = path.join('/', PREFIX, execId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', async (res) => {
            const [, , , exec] = res.key.toString().split('/');
            const data = { ...jsonHelper.tryParseJSON(res.value.toString()), execId: exec };
            this.emit('change', data);
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.stateSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { execId } = schema.instance;
        const _path = path.join('/', PREFIX, execId);
        return this._watcher.unwatch(_path);
    }
}

module.exports = AlgorithmExecutions;
