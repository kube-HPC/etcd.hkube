const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.WORKERS;
const schemas = require('./schema');

class Workers extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ ...l.value, jobId: l.key }));
    }
}

module.exports = Workers;
