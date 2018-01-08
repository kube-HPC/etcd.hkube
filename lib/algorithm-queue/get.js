const path = require('path');

class getQueue extends EventEmitter {
    constructor() {
        super();
        // this.watchSchema = djsv(watchSchema);
        // this.jobResultsSchema = djsv(jobResultsSchema);
        // this.getJobSchema = djsv(getJobSchema);
        // this._watchesMap = new Map();
    }

    init(parent) {
        this.parent = parent;
        this.etcd = this.parent.etcd3;
    }
}




module.exports = getQueue;