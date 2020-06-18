const uuidv4 = require('uuid/v4');
const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.EVENTS;
const schemas = require('./schema');

class Events extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async set(options) {
        const eventId = uuidv4();
        await super.set({ ...options, eventId });
        return eventId;
    }
}

module.exports = Events;
