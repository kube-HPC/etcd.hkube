const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.VERSIONS;
const schemas = require('./schema');

class Versions extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async create(version) {
        await super.set(version);
    }
}

module.exports = Versions;
