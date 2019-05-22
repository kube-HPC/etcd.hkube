const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.PIPELINES;
const schemas = require('./schema');

class Pipelines extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = Pipelines;
