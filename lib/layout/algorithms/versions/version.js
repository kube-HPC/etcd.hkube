const { uid } = require('@hkube/uid');

class Version {
    constructor(options) {
        this.id = uid({ length: 10 });
        this.name = options.name;
        this.created = Date.now();
        this.algorithm = options;
    }
}

module.exports = Version;
