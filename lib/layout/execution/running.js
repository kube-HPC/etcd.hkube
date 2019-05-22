const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.EXECUTIONS.RUNNING;
const schemas = require('./schema');

class RunningPipelines extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = RunningPipelines;
