const getSchema = {
    type: 'object',
    properties: {
        queueName: {
            type: 'string',
            default: ''
        }
    }
};

const setSchema = {
    type: 'object',
    properties: {
        data: {
            default: null,
            anyOf: [
                {
                    type: [
                        'array',
                        'string',
                        'object',
                        'null'
                    ]
                }
            ]
        }
    }
};

const watchSchema = {
    type: 'object',
    properties: {
        queueName: {
            type: 'string',
            default: ''
        }
    }
};

module.exports = {
    getSchema,
    setSchema,
    watchSchema
};
