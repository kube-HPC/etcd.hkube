const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.WORKERS;
const schemas = require('./schema');

class Workers extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = Workers;
