const { uuid } = require('@hkube/uid');

class Event {
    constructor(options) {
        this.eventId = uuid();
        this.timestamp = Date.now();
        this.source = options.source || 'unknown';
        this.type = options.type || 'normal';
        this.reason = options.reason;
        this.message = options.message;
    }
}

module.exports = Event;
