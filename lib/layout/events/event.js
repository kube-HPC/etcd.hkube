const uuidv4 = require('uuid/v4');

class Event {
    constructor(options) {
        this.eventId = uuidv4();
        this.timestamp = Date.now();
        this.source = options.source || 'unknown';
        this.type = options.type || 'normal';
        this.reason = options.reason;
        this.message = options.message;
    }
}

module.exports = Event;
