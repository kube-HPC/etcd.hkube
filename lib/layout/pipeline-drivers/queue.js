const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.PIPELINE_DRIVERS.QUEUE;
const schemas = require('./schema');

class PipelineDriverQueue extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = PipelineDriverQueue;
