const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.TENSORBOARDS.TASKS;
const schemas = require('./schema');

class TasksTensorboards extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = TasksTensorboards;
