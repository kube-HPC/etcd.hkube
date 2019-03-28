const jsonHelper = require('../helpers/json');

class Leaser {
    constructor(options) {
        this._lease = null;
        this._client = options.client;
    }

    async create(ttl, path, value) {
        if (this._lease && this._lease.state === 0) {
            return null;
        }
        this._ttl = ttl;
        this._path = path;
        this._lease = this._client.lease(this._ttl);
        this._lease.on('lost', () => {
            this.create(this._ttl, this._path, this._lastValue);
        });
        await this.update(value);
        return value;
    }

    async get(path) {
        const res = await this._client.get(path);
        return jsonHelper.tryParseJSON(res);
    }

    async list(path) {
        const results = [];
        const list = await this._client.getAll().prefix(path);
        Object.entries(list).forEach(([key, val]) => {
            const value = jsonHelper.tryParseJSON(val);
            results.push({ key, value });
        });
        return results;
    }

    async update(value) {
        this._lastValue = value;
        await this._lease.put(this._path).value(JSON.stringify(value)).catch(() => { });
    }

    async release() {
        await this._lease.release();
    }

    async revoke() {
        await this._lease.revoke();
    }
}

module.exports = Leaser;
