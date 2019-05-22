const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.EXECUTIONS.STORED;
const schemas = require('./schema');

class Execution extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = Execution;
