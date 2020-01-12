const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.TENSORBOARDS.BATCH;
const schemas = require('./schema');

class BatchTensorboards extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = BatchTensorboards;
