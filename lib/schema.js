const uuidv4 = require('uuid/v4');

const registerSchema = {
    type: 'object',
    properties: {
        ttl: {
            type: 'integer',
            default: 10,
        },
        data: {
            default: {},
            anyOf: [
                {
                    type: [
                        'string',
                        'object',
                        'null'
                    ]
                }
            ]
        },
        instanceId: {
            type: 'string'
        }
    }
};
const setSchema = {
    type: 'object',
    properties: {
        serviceName: {
            type: 'string',
            default: ''
        },
        data: {
            default: {},
            anyOf: [
                {
                    type: [
                        'string',
                        'object',
                        'null'
                    ]
                }
            ]
        },
        instanceId: {
            type: 'string'
        },
        suffix: {
            default: '',
            type: 'string'
        }
    }
};
const watchSchema = {
    type: 'object',
    properties: {
        serviceName: {
            anyOf: [
                {
                    type: [
                        'string',
                        'null'
                    ]
                }
            ],
            default: null
        },
        instanceId: {
            type: 'string',
            default: ''
        }
    }
};
const getSchema = {
    type: 'object',
    properties: {
        serviceName: {
            anyOf: [
                {
                    type: [
                        'string',
                        'null'
                    ]
                }
            ],
            default: null
        },
        prefix: {
            anyOf: [
                {
                    type: [
                        'string',
                        'null'
                    ]
                }
            ],
            default: 'services'
        },
        instanceId: {
            type: 'string',
            default: ''
        },
        suffix: {
            default: '',
            type: 'string'
        }
    }
};
const discoveryGetSchema = {
    type: 'object',
    properties: {
        serviceName: {
            anyOf: [
                {
                    type: [
                        'string',
                        'null'
                    ]
                }
            ],
            default: null
        },
        instanceId: {
            type: 'string',
            default: ''
        }
    }
};
const initSchema = {
    type: 'object',
    properties: {
        etcd: {
            type: 'object',
            properties: {
                host: {
                    type: 'string'
                },
                port: {
                    anyOf: [
                        {
                            type: [
                                'integer',
                                'string'
                            ]
                        }
                    ]
                },
                protocol: {
                    type: 'string',
                    default: 'http'
                }
            },
            required: [
                'host',
                'port'
            ]
        },
        serviceName: {
            type: 'string'

        },
        instanceId: {
            default: uuidv4(),
            type: 'string'
        },
        taskId: {
            type: 'string'
        },
        jobId: {
            type: 'string'
        }
    },
    required: [
        'serviceName'
    ]
};

module.exports = {
    getSchema,
    initSchema,
    registerSchema,
    watchSchema,
    setSchema,
    discoveryGetSchema
}; 
