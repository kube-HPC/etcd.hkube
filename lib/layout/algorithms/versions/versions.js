const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.VERSIONS;
const schemas = require('../versions/schema');

class TemplatesStore extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = TemplatesStore;
