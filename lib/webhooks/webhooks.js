const Service = require('../service');
const template = require('../templates').TEMPLATES.WEBHOOKS;
const schemas = require('./schema');

class Webhooks extends Service {
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
        const map = Object.create(null);
        list.forEach((l) => {
            if (!map[l.jobId]) {
                map[l.jobId] = {};
            }
            map[l.jobId][l.type] = l.value;
        });
        return Object.entries(map).map(([k, v]) => ({ jobId: k, ...v }));
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

module.exports = Webhooks;

