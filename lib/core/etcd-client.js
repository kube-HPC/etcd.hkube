const { Etcd3, isRecoverableError } = require('etcd3');
const { Policy } = require('cockatiel');
const validator = require('../validation/validator');
const jsonHelper = require('../helpers/json');
const queryHelper = require('../helpers/query-parser');
const { initSchema } = require('./init-schema');
const Leaser = require('./leaser');
const Watcher = require('./watcher');
const Locker = require('./locker');

const schema = validator.compile(initSchema);

class EtcdClient {
    constructor(options) {
        validator.validate(schema, options);
        const hosts = `${options.protocol}://${options.host}:${options.port}`;
        const etcdOptions = {
            hosts,
            grpcOptions: {
                'grpc.max_receive_message_length': -1
            },
            faultHandling: {
                host: () => Policy.noop,
                global: Policy.handleWhen(isRecoverableError).retry(options.retry || 3),
            },
            defaultCallOptions: (context) => (context.isStream || !options.timeout ? {} : { deadline: Date.now() + options.timeout }),
            ...options.clientOptions
        };
        this.client = new Etcd3(etcdOptions);
        this.leaser = new Leaser(this);
        this.watcher = new Watcher(this);
        this.locker = new Locker(this);
    }

    async get(path, { isPrefix = true } = {}) {
        if (isPrefix) {
            return this.client.getAll().prefix(path);
        }
        const res = await this.client.get(path);
        return jsonHelper.tryParseJSON(res);
    }

    delete(path, { isPrefix = false } = {}) {
        if (isPrefix) {
            return this.client.delete().prefix(path);
        }
        return this.client.delete().key(path);
    }

    put(path, value) {
        return this.client.put(path).value(JSON.stringify(value));
    }

    async getByQuery(path, options) {
        const { order, sort, limit, keysOnly } = queryHelper.parse(options);
        return this.getSortLimit(path, [order, sort], limit, keysOnly);
    }

    // sort(target: "Key" | "Version" | "Create" | "Mod" | "Value", order: "None" | "Ascend" | "Descend"):
    async getSortLimit(path, sort, limit, keysOnly = false) {
        if (keysOnly) {
            return this.client.getAll()
                .prefix(path)
                .sort(...sort)
                .limit(limit)
                .keys();
        }
        return this.client.getAll()
            .prefix(path)
            .sort(...sort)
            .limit(limit);
    }
}

module.exports = EtcdClient;
