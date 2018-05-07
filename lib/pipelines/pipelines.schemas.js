const pipelineSchema = {
    type: 'object',
    properties: {
        name: {
            default: '',
            type: 'string'
        }
    }
};

const deleteSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        }
    },
    required: [
        'name'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        index: {
            default: null,
            anyOf: [
                {
                    type: [
                        'integer',
                        'null'
                    ]
                }
            ]
        },
        name: {
            default: '',
            type: 'string'
        }
    }
};

module.exports = {
    pipelineSchema,
    watchSchema,
    deleteSchema
};
