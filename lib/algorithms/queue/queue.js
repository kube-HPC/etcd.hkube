const Service = require('../../service');
const template = require('../../templates').TEMPLATES.ALGORITHMS_QUEUE;
const schemas = require('./schema');

class AlgorithmQueue extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
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
        return list.map(l => l.value);
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

module.exports = AlgorithmQueue;
