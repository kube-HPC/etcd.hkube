const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.DEBUG;
const schemas = require('./schema');

class DebugAlgorithm extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = DebugAlgorithm;

