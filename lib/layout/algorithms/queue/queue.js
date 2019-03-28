const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.QUEUE;
const schemas = require('./schema');

class AlgorithmQueue extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }
}

module.exports = AlgorithmQueue;
