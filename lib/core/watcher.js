

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
    constructor(options) {
        this._pathToWatch = new Map();
        this._get = options.get;
        this._client = options.client;
        this._get = this._get.bind(options);
    }

    async _getAndWatch(path, options) {
        const data = await this._get(path, options);
        const watcher = await this._watch(path);
        return { data, watcher };
    }

    _watch(path) {
        return this._client.watch().prefix(path).create();
    }

    async watch(path) {
        if (this._pathToWatch.has(path)) {
            throw new Error(`already watching on ${path}`);
        }
        const watch = await this._getAndWatch(path, { isPrefix: false });
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
