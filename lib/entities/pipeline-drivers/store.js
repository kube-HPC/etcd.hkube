const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.PIPELINE_DRIVERS.STORE;
const schemas = require('./schema');

class TemplatesStore extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => l.data);
    }
}

module.exports = TemplatesStore;
