const Service = require('../../service');
const prefix = require('../../consts').PREFIX.ALGORITHM_DEBUG;
const { getSchema, setSchema, deleteSchema, watchSchema } = require('./schema');

class DebugAlgorithm extends Service {
    constructor(options) {
        super({ getSchema, setSchema, deleteSchema, watchSchema, prefix, template: '{algorithmName}', ...options });
    }

    get(options) {
        return super.get(options);
    }

    set(options) {
        return super.set(options);
    }

    delete(options) {
        return super.delete(options);
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ algorithmName: l.key, ...l.value }));
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    watch(options) {
        return super.watch(options);
    }

    unwatch(options) {
        return super.unwatch(options);
    }
}

module.exports = DebugAlgorithm;

