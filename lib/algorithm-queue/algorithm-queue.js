const path = require('path');
const { PREFIX } = require('../consts')
class algorithmQueue {
    constructor() {
        this.parent = null;
        this.etcd = null;
        // this.watchSchema = djsv(watchSchema);
        // this.jobResultsSchema = djsv(jobResultsSchema);
        // this.getJobSchema = djsv(getJobSchema);
        // this._watchesMap = new Map();
    }

    init(parent) {
        this.parent = parent;
        this.etcd = this.parent.etcd3;
    }

    get({queueName}) {
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, queueName);
        return this.etcd.get(_path, { isPrefix: false });
    }
    store({queueName,queue }= {}) {
        const _path = path.join('/', PREFIX.ALGORITHM_QUEUE, queueName);
        return this.etcd.put(_path, queue, null);;
    }

}




module.exports = algorithmQueue;