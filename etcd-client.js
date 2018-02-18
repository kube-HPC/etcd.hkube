const { Etcd3 } = require('etcd3');
const EventEmitter = require('events');

class EtcdClient extends EventEmitter {
    constructor(options) {
        super();
        this.client = new Etcd3(options);
        this._lease = null;
    }

    async get(path, { isPrefix = true } = {}) {
        if (isPrefix) {
            return this.client.getAll().prefix(path);
        }
        const res = await this.client.get(path);
        return JSON.parse(res);
    }

    async getAndWatch(path, options) {
        const data = await this.get(path, options);
        const watcher = await this.watch(path);
        return { data, watcher };
    }

    async delete(path, { isPrefix = false } = {}) {
        if (isPrefix) {
            return this.client.delete().prefix(path);
        }
        return this.client.delete().key(path);
    }

    async watch(path) {
        return this.client.watch().prefix(path).create();
    }

    async register(ttl, path, value) {
        if (this._lease && this._lease.state === 0) {
            throw new Error('cannot register twice');
        }
        this._ttl = ttl;
        this._path = path;
        this._lease = this.client.lease(this._ttl);
        try {
            await this._lease.put(this._path).value(JSON.stringify(value));
            await this._lease.keepaliveOnce();
        }
        catch (e) {
            console.error(e);
        }
        return this._lease;
    }

    async updateRegisteredData(value) {
        try {
            await this._lease.put(this._path).value(JSON.stringify(value));
        }
        catch (error) {
            await this.register(this._ttl, this._path, value);
        }
        return this._lease;
    }

    async put(path, value) {
        return this.client.put(path).value(JSON.stringify(value));
    }

    // sort(target: "Key" | "Version" | "Create" | "Mod" | "Value", order: "None" | "Ascend" | "Descend"):
    async getSortLimit(path, sort = ['Mod', 'Ascend'], limit = 100) {
        return this.client.getAll()
            .prefix(path)
            .sort(...sort)
            .limit(limit);
    }
}


module.exports = EtcdClient;
