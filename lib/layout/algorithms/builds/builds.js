const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.BUILDS;
const schemas = require('./schema');

class AlgorithmBuilds extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }
}

module.exports = AlgorithmBuilds;
