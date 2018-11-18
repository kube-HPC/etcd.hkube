const path = require('path');

class Locker {
    constructor(client) {
        this._client = client;
        this._locks = new Map();
    }

    async acquire(type, key) {
        const lockKey = path.join('locks', type, key);
        let lock = await this._client.acquireLock(lockKey);
        if (lock) {
            this._locks.set(lockKey, lock);
        }
        if (this._locks.has(lockKey)) {
            lock = this._locks.get(lockKey);
        }
        return lock;
    }

    async release(type, key) {
        const lockKey = path.join('locks', type, key);
        const lock = this._locks.get(lockKey);
        this._locks.delete(lockKey);
        return this._client.releaseLock(lock);
    }
}

module.exports = Locker;
