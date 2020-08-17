const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.STREAMING.STATISTICS;
const schemas = require('./schema');

class StreamingStatistics extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }
}

module.exports = StreamingStatistics;
