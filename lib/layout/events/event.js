const uuidv4 = require('uuid/v4');

class Event {
    constructor(options) {
        this.eventId = uuidv4();
        this.timestamp = Date.now();
        this.source = options.source || 'generic';
        this.type = options.type || 'noraml';
        this.reason = options.reason;
        this.message = options.message;
        this.algorithmName = options.algorithmName;
    }
}

module.exports = Event;
