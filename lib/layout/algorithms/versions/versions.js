const { uid } = require('@hkube/uid');
const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.ALGORITHMS.VERSIONS;
const schemas = require('./schema');

class TemplatesStore extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async create(algorithm) {
        const id = uid({ length: 10 });
        await super.set({ ...algorithm, id });
        return id;
    }
}

module.exports = TemplatesStore;
