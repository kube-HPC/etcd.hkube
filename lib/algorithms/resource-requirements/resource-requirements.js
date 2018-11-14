const Service = require('../../service');
const prefix = require('../../consts').PREFIX.RESOURCE_REQUIREMENTS;
const { getSchema, setSchema, deleteSchema, watchSchema } = require('./schema');

class ResourceRequirements extends Service {
    constructor(options) {
        super({ getSchema, setSchema, deleteSchema, watchSchema, prefix, template: '{name}', ...options });
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
        return list.map(l => ({ name: l.key, data: l.value }));
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
