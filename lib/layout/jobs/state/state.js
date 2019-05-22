const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.STATE;
const schemas = require('./schema');

class JobState extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }
}

module.exports = JobState;
