const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.PIPELINE_DRIVERS.REQUIREMENTS;
const schemas = require('./schema');

class PipelineDriverRequirements extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = PipelineDriverRequirements;
