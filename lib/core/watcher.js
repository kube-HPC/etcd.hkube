const EventEmitter = require('events');
const watchTypes = require('../consts/watch-types');

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

class Watcher extends EventEmitter {
    constructor(options) {
        super();
        this._pathToWatch = new Map();
        this._get = options.get;
        this._client = options.client;
        this._get = this._get.bind(options);
        this._handleError = this._handleError.bind(this);
    }

    _handleError(err, path) {
        this.emit(watchTypes.ERROR, err, path);
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
        const watcher = await this._watch(path);
        const errorHandler = (err) => this._handleError(err, path);
        this._pathToWatch.set(path, { watcher, errorHandler });
        watcher.on(watchTypes.ERROR, errorHandler);
        return { watcher };
    }

    async getAndWatch(path) {
        if (this._pathToWatch.has(path)) {
            throw new Error(`already watching on ${path}`);
        }
        const watch = await this._getAndWatch(path, { isPrefix: false });
        const errorHandler = (err) => this._handleError(err, path);
        this._pathToWatch.set(path, { watcher: watch.watcher, errorHandler });
        watch.watcher.on(watchTypes.ERROR, errorHandler);
        return watch;
    }

    async unwatch(path) {
        const { watcher, errorHandler } = this._pathToWatch.get(path) || {};
        if (!watcher) {
            throw new Error(`unable to find watcher for ${path}`);
        }
        this._pathToWatch.delete(path);
        if (errorHandler) {
            watcher.removeListener(watchTypes.ERROR, errorHandler);
        }
        return watcher.cancel();
    }
}

module.exports = Watcher;
