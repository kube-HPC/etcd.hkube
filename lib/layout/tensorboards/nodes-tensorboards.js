const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.TENSORBOARDS.NODES;
const schemas = require('./schema');

class NodesTensorboards extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = NodesTensorboards;
