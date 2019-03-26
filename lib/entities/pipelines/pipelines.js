const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.PIPELINES;
const schemas = require('./schema');

class Pipelines extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ name: l.name, ...l.value }));
    }
}

module.exports = Pipelines;

