const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.DRIVERS;
const schemas = require('./schema');

class AlgorithmQueues extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }
}

module.exports = AlgorithmQueues;
