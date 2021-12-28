const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.ACTIVE;
const schemas = require('./schema');

class JobsActive extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }
}

module.exports = JobsActive;
