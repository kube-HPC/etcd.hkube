const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.EXECUTIONS;
const schemas = require('./schema');

class AlgorithmExecutions extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }
    async list(options) {
        const list = await super.list(options);
        return list.map(l => l.value);
    }
}

module.exports = AlgorithmExecutions;
