const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.WEBHOOKS;
const schemas = require('./schema');
const Webhook = require('./Webhook');

class Webhooks extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async set(options) {
        const data = new Webhook(options);
        return super.set(data);
    }

    async list(options) {
        const list = await super.list(options);
        const map = Object.create(null);
        list.forEach((l) => {
            if (!map[l.jobId]) {
                map[l.jobId] = {};
            }
            map[l.jobId][l.type] = l;
        });
        return Object.entries(map).map(([k, v]) => ({ jobId: k, ...v }));
    }
}

module.exports = Webhooks;
