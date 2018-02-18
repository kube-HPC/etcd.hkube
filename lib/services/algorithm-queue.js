const path = require('path');

class AlgorithmQueue {
    init(options) {
        this.services = options;
    }

    get({ queueName }) {
        const suffix = path.join('/', queueName);
        return this.services.get({ suffix });
    }

    store({ queueName, queue } = {}) {
        const suffix = path.join('/', queueName);
        return this.services.set({ suffix, data: queue });
    }
}

module.exports = AlgorithmQueue;
