const { Etcd3 } = require('etcd3');
const jsonHelper = require('./lib/helper/json');
const queryHelper = require('./lib/helper/query');

class EtcdClient {
    constructor(options) {
        this.client = new Etcd3(options);
        this._lease = null;
    }

    async get(path, { isPrefix = true } = {}) {
        if (isPrefix) {
            return this.client.getAll().prefix(path);
        }
        const res = await this.client.get(path);
        return jsonHelper.tryParseJSON(res);
    }

    async getAndWatch(path, options) {
        const data = await this.get(path, options);
        const watcher = await this.watch(path);
        return { data, watcher };
    }

    acquireLock(key) {
        return this.client.lock(key).acquire().catch(() => { });
    }

    releaseLock(lock) {
        if (lock) {
            return lock.release().catch(() => { });
        }
        return null;
    }

    delete(path, { isPrefix = false } = {}) {
        if (isPrefix) {
            return this.client.delete().prefix(path);
        }
        return this.client.delete().key(path);
    }

    watch(path) {
        return this.client.watch().prefix(path).create();
    }

    lease(ttl, path, value) {
        if (this._lease && this._lease.state === 0) {
            throw new Error('cannot register twice');
        }
        this._ttl = ttl;
        this._path = path;
        this._lease = this.client.lease(this._ttl);
        return this._updateLease(value);
    }

    updateLeaseData(value) {
        return this._updateLease(value);
    }

    _updateLease(value) {
        return this._lease.put(this._path).value(JSON.stringify(value));
    }

    async put(path, value) {
        return this.client.put(path).value(JSON.stringify(value));
    }

    async getByQuery(path, options) {
        const results = [];
        const { order, sort, limit } = queryHelper.parse(options);
        const list = await this.getSortLimit(path, [order, sort], limit);
        Object.entries(list).forEach(([k, v]) => {
            const [, , key, key2] = k.split('/');
            const value = jsonHelper.tryParseJSON(v);
            results.push({ key, key2, value });
        });
        return results;
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
