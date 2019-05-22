const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.DRIVERS;
const schemas = require('./schema');

class Drivers extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = Drivers;
