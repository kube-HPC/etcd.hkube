
const djsv = require('djsv');
const { registerSchema, watchSchema } = require('./schema');
const EventEmitter = require('events');
const path = require('path');
const { PREFIX } = require('./consts');
class discovery extends EventEmitter {


    constructor() {
        super();
        this.registerSchema = djsv(registerSchema);
        this.watchSchema = djsv(watchSchema);

    }

    init(parent) {
        this.parent = parent;
    }

    /**
    *  the start method used for begin storing data 
    * @param {object} options 
    * @param {integer}options.ttl  time to live in etcd
    * @param {object} options.data  object that need to be stored in etcd if update is needed use update function
    * @param {number} options.interval  in which interval the store is needed 
    * @param {string} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
    * @param {string} options.instanceId the specific guid the default data is a generated guid
    * 
    * @memberOf EtcdDiscovery
    */
    async register(options) {
        const registerSchemaInstance = this.registerSchema(options);
        if (registerSchemaInstance.valid) {
            let { ttl, interval, data, instanceId } = registerSchemaInstance.instance;
            let internalInstanceId = instanceId ? instanceId : this.parent._instanceId;
            this._registerPath = path.join('/', PREFIX.DISCOVERY, this.parent._serviceName, internalInstanceId);
            this._ttl = ttl;
            this._interval = interval;
            this._data = data;
            this._runInterval();
        } else {
            throw new Error(registerSchemaInstance.errorDescription);
        }
    }

    pause() {
        clearTimeout(this._intervalID);
    }

    /**
     * resuming paused interval
     * @memberOf EtcdDiscovery
     */
    resume() {
        this._runInterval();
    }

    async _runInterval() {
        //  let _etcdPath = etcdPath;
        this._intervalID = setTimeout(async () => {
            try {
                await this.parent._keyRegister(this._registerPath, this._ttl, this._data)
                this._runInterval();
            } catch (error) {
                this.emit(`etcd - error`, error)
            }
        }, this._interval);
    }

    /**
     * updating data for the current path 
     * @param {Object} data the updated date {}
     * @memberOf etcdDiscovery
     */
    updateRegisteredData(data) {
        this._data = data;
    }

    /**
   * watch notification for messages returns object with the current value and watch object
   * that can be used as follows 
   * watcher.on('change'/'expire'/'delete',data => {
   *    console.log('Value changed; new value: ', node);
   *   })
   * @param {object} options 
   * @param {string} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
   * @param {string} options.instanceId the specific guid the default data is a generated guid
   * @param {any} options.etcdOptions etcd options the default is  {wait: true}
   * @param {bool}options.etcdConfig.recursive (bool, list all values in directory recursively)
   * @param {bool}options.etcdConfig.wait (bool, wait for changes to key)
   * @param {integer}options.etcdConfig.waitIndex (wait for changes after given index)

   * @memberOf EtcdDiscovery
   */
    async watch(options) {
        return new Promise((res, rej) => {
            const watchSchemaInstance = this.watchSchema(options, {
                ignoreNull: true
            });
            if (watchSchemaInstance.valid) {
                let { serviceName, instanceId, index, etcdOptions } = watchSchemaInstance.instance;
                let internalServiceName = serviceName ? serviceName : this.parent._serviceName
                let _path = path.join('/', PREFIX.DISCOVERY, internalServiceName, instanceId);
                this.parent.etcd.get(_path, {}, (err, obj) => {
                    let watcher = this.parent.etcd.watcher(_path, index, etcdOptions)
                    if (err) {
                        if (err.errorCode == 100) {
                            return res({ obj: {}, watcher });
                        } else {
                            return rej(err)
                        }
                    }
                    return res({ obj, watcher });
                });
            } else {
                return rej(watchSchemaInstance.errorDescription);
            }
        });
    }

    // async _keyRegister(etcdPath, ttl) {
    //     return new Promise((resolve, reject) => {
    //         this.parent.etcd.set(etcdPath,
    //             JSON.stringify({
    //                 data: this._data
    //             }),
    //             { ttl }, (err, res) => {
    //                 if (err) {
    //                     return reject(err);
    //                 }
    //                 return resolve(res)
    //                 // console.log(`${res} - saved`)
    //             })
    //     });
    // }



}

module.exports = discovery;