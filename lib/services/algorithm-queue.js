const path = require('path');

class AlgorithmQueue {
    init(options) {
        this.services = options;
    }

    get({ name }) {
        const suffix = path.join('/', name);
        return this.services.get({ suffix });
    }

    store({ name, queue } = {}) {
        const suffix = path.join('/', name);
        return this.services.set({ suffix, data: queue });
    }
}

module.exports = AlgorithmQueue;
