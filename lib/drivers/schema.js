const getWorkersSchema = {
    type: 'object',
    properties: {
        workerId: {
            type: 'string'
        }
    },
    required: [
        'driverId'
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
        }
    },
    required: [
        'driverId',
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        workerId: {
            type: 'string',
            default: '',
        }
    }
};

module.exports = {
    getWorkersSchema,
    setWorkersSchema,
    watchSchema
};
