const { PREFIX, SUFFIX } = require('../consts');
const { getSetTaskSchema, getTasksSchema, watchSchema, jobResultsSchema } = require('./jobs.schemas');
const djsv = require('djsv');
const path = require('path');

class jobs {
    constructor() {
        this.getTasksSchema = djsv(getTasksSchema);
        this.getSetTaskSchema = djsv(getSetTaskSchema);
        this.watchSchema = djsv(watchSchema);
        this.jobResultsSchema = djsv(jobResultsSchema);
    }

    init(parent) {
        this.parent = parent;
    }

    async setTaskStatus(data) {
        return await this._setTask({ suffix: 'status', data })
    }

    async setTaskResult(data) {
        return await this._setTask({ suffix: 'result', data })
    }

    async getTaskStatus(data) {
        return await this._getTask({ suffix: 'status', data })
    }

    async getTaskResult(data) {
        return await this._getTask({ suffix: 'result', data })
    }

    /**
     * get the current messages returns object with the current value and watch object
     * 
     * @param {object} options 
     * @param {string} options.suffix suffix can be service or discovery or just ''
     * @param {any} options.etcdOptions etcd options the default is  {recursive: true}
     * @param {bool}options.etcdOptions.recursive (bool, list all values in directory recursively)
     * @param {bool}options.etcdOptions.wait (bool, wait for changes to key)
     * @param {integer}options.etcdConfig.waitIndex (wait for changes after given index)
     * 
     * @memberOf EtcdDiscovery
     */
    _getTasks(options) {
        return new Promise((res, rej) => {
            const getSchemaInstance = this.getTasksSchema(options, { ignoreNull: true });
            if (getSchemaInstance.valid) {
                let { jobId } = this.parent;
                let { suffix, etcdOptions } = getSchemaInstance.instance;
                let _path = path.join('/', PREFIX.JOBS, jobId, SUFFIX.tasks, suffix);
                this.parent.etcd.get(_path, etcdOptions, (err, obj) => {
                    if (err) {
                        return rej(err)
                    }
                    return res(obj)
                });
            } else {
                return rej(getSchemaInstance.errorDescription);
            }
        });
    }

    /**
 *  the start method used for begin storing data 
 * @param {object} options 
 * @param {object} options.data  object that need to be stored in etcd if update is needed use update function
 * @param {string} options.serviceName the path that will be store on etcd if not assigned than it gets the one from the init
 * @param {string} options.instanceId the specific guid the default data is a generated guid
 * @param {string} options.suffix suffix can be service or discovery or just ''
 * @memberOf EtcdDiscovery
 */
    async _setTask(options) {
        const setTasksSchemaInstance = this.getSetTaskSchema(options, { ignoreNull: true });
        if (setTasksSchemaInstance.valid) {
            if (!setTasksSchemaInstance.instance) {
                console.log('here');
            }
            let { jobId, taskId } = this.parent;
            let { suffix, data } = setTasksSchemaInstance.instance;
            let _path = path.join('/', PREFIX.JOBS, jobId, 'tasks', taskId, 'info', suffix);
            try {
                return await this.parent._keyRegister(_path, null, data);
            }
            catch (error) {
                throw error;
            }
        } else {
            throw new Error(setSchemaInstance.errorDescription);
        }
    }

    async getJobsTasks() {
        let results = null;
        try {
            let suffix = path.join('/', '')
            const result = await this._getTasks({});
            results = new Map();
            result.node.nodes.forEach(node => {
                const taskID = node.key.substr(node.key.indexOf('/tasks') + 7);
                const task = Object.create(null);
                node.nodes[0].nodes.forEach(n => {
                    const key = n.key.substr(n.key.lastIndexOf('/') + 1);
                    task[key] = this.parent._tryParseJSON(n.value);
                });
                results.set(taskID, task);
            });
        }
        catch (error) {
            if (error.errorCode === 100) {
                return null;
            }
            throw error;
        }
        return results;
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
    async _watch(options) {
        return new Promise((res, rej) => {
            const watchSchemaInstance = this.watchSchema(options, { ignoreNull: true });
            if (watchSchemaInstance.valid) {
                let { taskID, suffix, index, etcdOptions } = watchSchemaInstance.instance;
                let { jobId } = this.parent;
                let _path = path.join('/', PREFIX.JOBS, jobId, 'tasks', taskID, 'info', suffix);
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

    async setJobResults(options) {
        const schemaInstance = this.jobResultsSchema(options, { ignoreNull: true });
        if (schemaInstance.valid) {
            if (!schemaInstance.instance) {
                console.log('here');
            }
            let { jobId } = this.parent;
            let { data } = schemaInstance.instance;
            let _path = path.join('/', PREFIX.JOBS, 'jobResults', jobId, 'result');
            try {
                return await this.parent._keyRegister(_path, null, data);
            }
            catch (error) {
                throw error;
            }
        } else {
            throw new Error(setSchemaInstance.errorDescription);
        }
    }

    async onJobResult(options, callback) {
        let watch = await this._watch({ suffix: 'result', taskID: options.taskID });
        watch.watcher.on('change', res => {
            const result = JSON.parse(res.node.value);
            callback(result);
        });
    }
}

module.exports = jobs;