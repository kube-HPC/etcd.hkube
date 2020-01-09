const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.EXPERIMENT;
const schemas = require('./schema');

class Experiment extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = Experiment;
