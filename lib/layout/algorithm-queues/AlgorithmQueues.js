const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.ALGORITHM_QUEUES;
const schemas = require('./schema');

class AlgorithmQueues extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }
}

module.exports = AlgorithmQueues;
