const Etcd = require('node-etcd');
const EventEmitter = require('events');
const path = require('path');
const { defaults } = require('lodash');
const djsv = require('djsv');
const { PREFIX } = require('./consts');
const discovery = require('./discovery');
const services = require('./services');
const { registerSchema, watchSchema, initSchema, getSchema, setSchema, updateInitSchema } = require('./schema');
// const PREFIX = {
//     DISCOVERY: 'discovery',
//     SERVICES: 'services'
// }

class EtcdDiscovery extends EventEmitter {

    constructor() {
        super();
        this.instanceId = ''
        this.registerSchema = djsv(registerSchema);
        this.watchSchema = djsv(watchSchema);
        this.initSchema = djsv(initSchema);
        this.getSchema = djsv(getSchema);
        this.setSchema = djsv(setSchema);
        this.updateInitSchema = djsv(updateInitSchema);
        this.discovery = new discovery();
        this.services = new services();
    }

    /**
     * init data for starting
     * @param {object} options 
     * @param {object} options.etcd contains object for connection {protocol:host:"host ip", port:"port"} 
     * @param {string} options.etcd.protocol protocol http or https 
     * @param {string} options.etcd.host host can be name or ip 
     * @param {integer} options.etcd.port port number 
     * @param {object} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
     * @param {object} options.taskId workerID
     * @param {object} options.jobId the pipeline instanceID
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @memberOf etcdDiscovery
     */
    async init(options) {
        let initSchemaConfig = this.initSchema(options);
        if (initSchemaConfig.valid) {
            this._etcdConfigPath = `${initSchemaConfig.instance.etcd.protocol}://${initSchemaConfig.instance.etcd.host}:${initSchemaConfig.instance.etcd.port}`;
            //    console.log(`etcd config: ${this._etcdConfigPath}`)
            this.etcd = new Etcd(this._etcdConfigPath);
            this._serviceName = initSchemaConfig.instance.serviceName;
            this._instanceId = initSchemaConfig.instance.instanceId;
            this._jobId = initSchemaConfig.instance.jobId;
            this._taskID = initSchemaConfig.instance.taskId;
            this.discovery.init(this);
            this.services.init(this);
            return this;
        } else {
            throw new Error(initSchemaConfig.errorDescription)
        }
    }


    /**
     * init data for starting
     * @param {object} options 
     * @param {object} options.etcd contains object for connection {protocol:host:"host ip", port:"port"} 
     * @param {string} options.etcd.protocol protocol http or https 
     * @param {string} options.etcd.host host can be name or ip 
     * @param {integer} options.etcd.port port number 
     * @param {object} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
     * @param {object} options.taskId workerID
     * @param {object} options.jobId the pipeline instanceID
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @memberOf etcdDiscovery
     */
    async updateInitSetting(options) {
        let updateInitSchemaConfig = this.updateInitSchema(options);
        if (updateInitSchemaConfig.valid) {
            this._etcdConfigPath = `${updateInitSchemaConfig.instance.etcd.protocol}://${updateInitSchemaConfig.instance.etcd.host}:${updateInitSchemaConfig.instance.etcd.port}`;
            this.etcd = new Etcd(this._etcdConfigPath);
            this._serviceName = updateInitSchemaConfig.instance.serviceName;
            this._instanceId = updateInitSchemaConfig.instance.instanceId;
            this._taskId = updateInitSchemaConfig.instance.taskId;
            this._jobId = updateInitSchemaConfig.instance.jobId;

        }

    }





    async _keyRegister(etcdPath, ttl, data) {
        return new Promise((resolve, reject) => {
            this.etcd.set(etcdPath,
                JSON.stringify({
                    data
                }),
                { ttl }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res)
                    // console.log(`${res} - saved`)
                })
        });
    }



}

module.exports = EtcdDiscovery;