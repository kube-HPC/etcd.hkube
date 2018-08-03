const getSchema = {
    type: 'object',
    properties: {
        algorithmName: {
            type: 'string',
            default: ''
        }
    }
};

const setSchema = {
    type: 'object',
    properties: {
        algorithmName: {
            type: 'string'
        },
        data: {
            default: null,
            anyOf: [
                {
                    type: [
                        'string',
                        'object',
                        'null'
                    ]
                }
            ]
        }
    },
    required: [
        'algorithmName'
    ]
};


const deleteSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        }
    },
    required: [
        'algorithmName'
    ]
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema
};
