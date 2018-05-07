const getWorkersSchema = {
    type: 'object',
    properties: {
        suffix: {
            default: '',
            type: 'string'
        },
        workerId: {
            type: 'string'
        }
    },
    required: [
        'workerId'
    ]
};

const setWorkersSchema = {
    type: 'object',
    properties: {
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
        workerId: {
            type: 'string'
        },
        suffix: {
            default: '',
            type: 'string'
        }
    },
    required: [
        'workerId',
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        workerId: {
            type: 'string',
            default: '',
        },
        prefix: {
            default: '',
            type: 'string'
        },
        suffix: {
            default: '',
            type: 'string'
        }
    }
};

module.exports = {
    getWorkersSchema,
    setWorkersSchema,
    watchSchema
};
