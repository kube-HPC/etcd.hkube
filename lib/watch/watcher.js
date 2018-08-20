

/**
* watch events 
* "connecting"
* "connected"
* "data"
* "put"
* "delete"
* "end"
* "disconnected"
* "error"
 * @class Watcher
 */

class Watcher {
    constructor(client) {
        this._pathToWatch = new Map();
        this._client = client;
    }

    async watch(path) {
        if (this._pathToWatch.has(path)) {
            throw new Error(`already watching on ${path}`);
        }
        const watch = await this._client.getAndWatch(path, { isPrefix: false });
        this._pathToWatch.set(path, watch.watcher);
        return watch;
    }

    async unwatch(path) {
        const watcher = this._pathToWatch.get(path);
        if (!watcher) {
            throw new Error(`unable to find watcher for ${path}`);
        }
        this._pathToWatch.delete(path);
        return watcher.cancel();
    }
}

module.exports = Watcher;
