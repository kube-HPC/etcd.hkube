const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.VERSIONS;
const schemas = require('./schema');
const Version = require('./version');

class Versions extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async create(options) {
        const version = new Version(options);
        version.algorithm.versionId = version.id;
        await super.set(version);
        return version.id;
    }
}

module.exports = Versions;
