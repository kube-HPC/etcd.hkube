const path = require('path');

class Locker {
    constructor(options) {
        this._client = options.client;
        this._locks = new Map();
    }

    async acquire(key) {
        let success = false;
        const lockKey = this._lockKey(key);
        let lock = await this._acquireLock(lockKey);
        if (lock) {
            success = true;
            this._locks.set(lockKey, lock);
        }
        if (this._locks.has(lockKey)) {
            lock = this._locks.get(lockKey);
        }
        return { success, lock };
    }

    async release(key) {
        let success = false;
        const lockKey = this._lockKey(key);
        const lock = this._locks.get(lockKey);
        if (lock) {
            success = true;
        }
        this._locks.delete(lockKey);
        await this._releaseLock(lock);
        return { success, lock };
    }

    _lockKey(key) {
        return path.join('locks', key);
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
