const Service = require('../service');
const prefix = require('../consts').PREFIX.EXECUTIONS;
const { getSchema, setSchema, deleteSchema, watchSchema } = require('./schema');

class Execution extends Service {
    constructor(options) {
        super({ getSchema, setSchema, deleteSchema, watchSchema, prefix, template: '{jobId}', ...options });
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
        return list.map(l => ({ ...l.value, jobId: l.key }));
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

module.exports = Execution;
