const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.REQUIREMENTS;
const schemas = require('./schema');

class ResourceRequirements extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ name: l.name, data: l.value }));
    }
}

module.exports = ResourceRequirements;
