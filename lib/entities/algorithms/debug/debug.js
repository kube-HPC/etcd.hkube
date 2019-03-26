const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.DEBUG;
const schemas = require('./schema');

class DebugAlgorithm extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ algorithmName: l.algorithmName, ...l.value }));
    }
}

module.exports = DebugAlgorithm;

