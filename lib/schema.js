
const uuidv4 = require('uuid/v4');

const registerSchema = {
    "type": "object",
    "properties": {
        "ttl": {
            "type": "integer",
            "default": 10,
        },
        "data": {
            "default": {},
            "type": "object"
        },
        "instanceId": {
            "type": "string"
        },
        "interval": {
            "default": 1000,
            "type": "integer"
        }
    }
}

const setSchema = {
    "type": "object",
    "properties": {
        "serviceName": {
            "type": "string",
            "default": ""
        },
        "data": {
            "default": {},
            "type": "object"
        },
        "instanceId": {
            "type": "string"
        },
        "suffix": {
            "default": '',
            "type": "string"
        }
    }
}

const watchSchema = {
    "type": "object",
    "properties": {
        "serviceName": {
            "type": ["string", "null"],
            "default": null
        },
        "instanceId": {
            "type": "string",
            "default": ""
        },
        "etcdOptions": {
            "default": { wait: true, recursive: true },
            "type": "object"
        },
        "index": {
            "default": null,
            "type": ["integer", "null"]
        }
    }
}
const getSchema = {
    "type": "object",
    "properties": {
        "serviceName": {
            "type": ["string", "null"],
            "default": null
        },
        "prefix": {
            "type": ["string", "null"],
            "default": 'services'
        },
        "instanceId": {
            "type": "string",
            "default": ""
        },
        "etcdOptions": {
            "type": "object",
            "default": { recursive: true }
        },
        "index": {
            "default": null,
            "type": ["integer", "null"]
        },
        "suffix": {
            "default": '',
            "type": "string"
        }
    }
}

const initSchema = {
    "type": "object",
    "properties": {
        "etcd": {
            "type": "object",
            "properties": {
                "host": {
                    "type": "string",
                    "required": true
                },
                "port": {
                    "type": ["integer", "string"],
                    "required": true
                },
                "protocol": {
                    "type": "string",
                    "default": "http"
                }
            }
        },
        "serviceName": {
            "type": "string",
            "required": true

        },
        "instanceId": {
            "default": uuidv4(),
            "type": "string"
        },
        "taskId": {
            "type": "string"
        },
        "jobId": {
            "type": "string"
        },
    }
}

const updateInitSchema = (options) => {
    return {
        "type": "object",
        "properties": {
            "etcd": {
                "type": "object",
                "properties": {
                    "host": {
                        "default": options.etcd.host,
                        "type": "string"
                    },
                    "port": {
                        "default": options.etcd.port,
                        "type": "integer"
                    },
                    "protocol": {
                        "default": options.etcd.protocol,
                        "type": "string",
                    }
                }
            },
            "serviceName": {
                "default": options.serviceName,
                "type": "string"
            },
            "instanceId": {
                "default": options.instanceId,
                "type": "string"
            },
            "taskId": {
                "default": options.taskId,
                "type": "string"
            },
            "jobId": {
                "default": options.jobId,
                "type": "string"
            },
        }

    }
}
module.exports = {
    getSchema,
    initSchema,
    registerSchema,
    watchSchema,
    setSchema,
    updateInitSchema
} 
