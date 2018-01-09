const { Etcd3 } = require('etcd3');

class etcdClient {
    constructor(options) {
        this.client = new Etcd3(options);
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
        const watcher = await this.client.watch().prefix(path).create();
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
        const lease = this.client.lease(ttl);
        try {
            await lease.put(path).value(JSON.stringify(value));
            await lease.keepaliveOnce();
        }
        catch (e) {
            console.error(e);
        }
        return lease;
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


module.exports = etcdClient;
