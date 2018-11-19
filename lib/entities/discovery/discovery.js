
const validator = require('../../validation/validator');
const Service = require('../../core/service');
const schemas = require('./schema');
const template = require('../../core/templates').TEMPLATES.DISCOVERY;

class discovery extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
        this._registerSchema = validator.compile(schemas.registerSchema);
        const initSchema = validator.compile(schemas.initSchema);
        validator.validate(initSchema, options);
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
    }

    get(option) {
        const options = option || {};
        super.validateGet(options);
        let { instanceId, serviceName } = options;
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        return super.get({ instanceId, serviceName });
    }

    set(option) {
        const options = option || {};
        super.validateSet(options);
        let { instanceId, serviceName, data } = options;
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        return super.set({ instanceId, serviceName, data });
    }

    delete(option) {
        const options = option || {};
        super.validateSet(options);
        let { instanceId, serviceName } = options;
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        return super.delete({ instanceId, serviceName });
    }

    async list(option) {
        const options = option || {};
        const list = await super.list(options);
        return list.map(l => ({ ...l.value, jobId: l.jobId }));
    }

    register(option) {
        const options = option || {};
        super._validateSchema(this._registerSchema, options);
        let { ttl, serviceName, instanceId, data } = options;
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        const path = this.getPath({ serviceName, instanceId });
        return this._client.leaser.create(ttl, path, data);
    }

    updateRegisteredData(data) {
        return this._client.leaser.update(data);
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    watch(option) {
        const options = option || {};
        super.validateWatch(options);
        const serviceName = options.serviceName || this._serviceName;
        const instanceId = options.instanceId || this._instanceId;
        return super.watch({ serviceName, instanceId });
    }

    unwatch(option) {
        const options = option || {};
        super.validateWatch(options);
        const serviceName = options.serviceName || this._serviceName;
        const instanceId = options.instanceId || this._instanceId;
        return super.unwatch({ serviceName, instanceId });
    }
}

module.exports = discovery;
