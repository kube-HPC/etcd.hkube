const getSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string',
            default: ''
        },
        type: {
            type: 'string',
            default: ''
        }
    }
};

const setSchema = {
    type: 'object',
    properties: {
        jobId: {
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
        'jobId'
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
        'jobId'
    ]
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema
};
