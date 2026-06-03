const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.GRACEFUL;
const schemas = require('./schema');

class AlgorithmGraceful extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async getAll(algorithmNames) {
        const results = {};
        await Promise.all(algorithmNames.map(async (name) => {
            const result = await this.get({ name });
            results[name] = result ? result.jobIds || [] : [];
        }));
        return results;
    }
}

module.exports = AlgorithmGraceful;
