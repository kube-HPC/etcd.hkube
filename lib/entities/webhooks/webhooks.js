const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.WEBHOOKS;
const schemas = require('./schema');

class Webhooks extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async list(options) {
        const list = await super.list(options);
        const map = Object.create(null);
        list.forEach((l) => {
            if (!map[l.jobId]) {
                map[l.jobId] = {};
            }
            map[l.jobId][l.type] = l.value;
        });
        return Object.entries(map).map(([k, v]) => ({ jobId: k, ...v }));
    }
}

module.exports = Webhooks;

