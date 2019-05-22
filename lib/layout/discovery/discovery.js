
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
        const { instanceId, serviceName, data } = options;
        const service = serviceName || this._serviceName;
        const instance = instanceId || this._instanceId;
        return super.set({ serviceName: service, instanceId: instance, data });
    }

    delete(option) {
        const options = option || {};
        super.validateSet(options);
        const { instanceId, serviceName } = options;
        const service = serviceName || this._serviceName;
        const instance = instanceId || this._instanceId;
        return super.delete({ serviceName: service, instanceId: instance });
    }

    async list(options) {
        const list = await super.list(options);
        return list;
    }

    register(option) {
        const options = option || {};
        super._validateSchema(this._registerSchema, options);
        const { ttl, serviceName, instanceId, data } = options;
        const service = serviceName || this._serviceName;
        const instance = instanceId || this._instanceId;
        const path = this._getPath({ serviceName: service, instanceId: instance });
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
        const { instanceId } = options;
        const serviceName = options.serviceName || this._serviceName;
        return super.watch({ serviceName, instanceId });
    }

    unwatch(option) {
        const options = option || {};
        super.validateWatch(options);
        const { instanceId } = options;
        const serviceName = options.serviceName || this._serviceName;
        return super.unwatch({ serviceName, instanceId });
    }
}

module.exports = discovery;
