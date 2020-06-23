
const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.EVENTS.PIPELINES;
const schemas = require('./schema');
const Event = require('./event');

class Events extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async set(options) {
        const event = new Event(options);
        await super.set(event);
        return event.eventId;
    }
}

module.exports = Events;
