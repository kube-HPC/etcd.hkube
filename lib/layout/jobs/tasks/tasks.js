const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.TASKS;
const schemas = require('./schema');

class Tasks extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = Tasks;
