const path = require('path');

class AlgorithmQueue {
    constructor() {
        this.parent = null;
        this.etcd = null;
        // this.watchSchema = djsv(watchSchema);
        // this.jobResultsSchema = djsv(jobResultsSchema);
        // this.getJobSchema = djsv(getJobSchema);
        // this._watchesMap = new Map();
    }

    init(parent) {
        this.etcd = parent.etcd;
        this.services = parent.services;
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
