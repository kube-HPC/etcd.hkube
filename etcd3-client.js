const { Etcd3 } = require('etcd3')

class etcdClient {
    constructor(options) {
        this.client = new Etcd3(options)
    }
    async get(path, { isPrefix = true }) {
        if (isPrefix) {
            let bla = await this.client.getAll().prefix(path)
        } else {
            let res = await this.client.get(path);
            return JSON.parse(res)
        }
    }

    async getAndWatch(path) {
        let data = await this.client.getAll().prefix(path);
        let watcher = await this.client.watch().prefix(path).create();
        return { data, watcher }
    }

    async delete(path) {
        return await this.client().delete().prefix(path);
    }

    async watch(path) {
        return await this.client.watch().prefix(path).create();
    }

    async register(ttl, path, value) {
        const lease = this.client.lease(ttl);
        try {
            await lease.put(path).value(JSON.stringify(value));
            await lease.keepaliveOnce();
        } catch (e) {
            console.error(e);
        }
        return lease

    }
    async put(path, value, options) {
        return await this.client.put(path).value(JSON.stringify(value));
    }
}


module.exports = etcdClient;