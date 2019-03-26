const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.PIPELINE_DRIVERS.QUEUE;
const schemas = require('./schema');

class PipelineDriverQueue extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => l.value);
    }
}

module.exports = PipelineDriverQueue;
