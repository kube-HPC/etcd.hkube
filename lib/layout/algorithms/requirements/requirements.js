const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.REQUIREMENTS;
const schemas = require('./schema');

class ResourceRequirements extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = ResourceRequirements;
