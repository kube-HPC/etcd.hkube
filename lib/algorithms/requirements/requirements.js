const Service = require('../../service');
const template = require('../../templates').TEMPLATES.ALGORITHMS_REQUIREMENTS;
const schemas = require('./schema');

class ResourceRequirements extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
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
        return list.map(l => ({ name: l.name, data: l.value }));
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    async watch(options) {
        return super.watch(options);
    }

    async unwatch(options) {
        return super.unwatch(options);
    }
}

module.exports = ResourceRequirements;
