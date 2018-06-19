const path = require('path');

class Locker {
    constructor(client, options) {
        this._client = client;
        this._locks = new Map();
        this._lockKey = path.join(options.prefix, 'locks');
    }

    async acquire(type, args) {
        const lockKey = path.join(this._lockKey, type, ...args);
        let lock = await this._client.acquireLock(lockKey);
        if (lock) {
            this._locks.set(lockKey, lock);
        }
        if (this._locks.has(lockKey)) {
            lock = this._locks.get(lockKey);
        }
        return lock;
    }

    async release(type, args) {
        const lockKey = path.join(this._lockKey, type, ...args);
        const lock = this._locks.get(lockKey);
        this._locks.delete(lockKey);
        return this._client.releaseLock(lock);
    }
}

module.exports = Locker;
