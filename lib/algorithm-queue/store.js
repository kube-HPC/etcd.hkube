const path = require('path');

class storeQueue extends EventEmitter {
    constructor() {
        super();
       
    }

    init(parent) {
        this.parent = parent;
        this.etcd = this.parent.etcd3;
    }
}




module.exports = storeQueue;