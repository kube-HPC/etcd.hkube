const path = require('path');

class Locker {
    constructor(options) {
        this._client = options.client;
        this._locks = new Map();
    }

    async acquire(type, key) {
        const lockKey = path.join('locks', type, key);
        let lock = await this._acquireLock(lockKey);
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
        return this._releaseLock(lock);
    }

    _acquireLock(key) {
        return this._client.lock(key).acquire().catch(() => { });
    }

    _releaseLock(lock) {
        if (lock) {
            return lock.release().catch(() => { });
        }
        return null;
    }
}

module.exports = Locker;
