const { Etcd3 } = require('etcd3')

class etcdClient {
    constructor(options) {
        this.client = Etcd3(options)
    }
    async get(path) {
        return await this.client.getAll().prefix(path)
    }
    async getAndWatch(path) {


        let data = await this.client.getAll().prefix(path);
        let watcher = await this.watch(path);

        return { data, watcher, cancel }
    }
    async delete() {

    }
    async watch(path) {
        return await watch.prefix(path).create();

    }

    async register(path, ttl, value) {
        const lease = client.lease(ttl);
        await lease.keepaliveOnce();
        return await lease.put(path).value(val);

    }
}


module.exports = etcdClient;