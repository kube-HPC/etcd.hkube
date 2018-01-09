const pipelineSchema = {
    type: 'object',
    properties: {
        etcdOptions: {
            type: 'object',
            default: { recursive: true }
        },
        name: {
            default: '',
            type: 'string'
        }
    }
};

const deleteSchema = {
    type: 'object',
    properties: {
        etcdOptions: {
            type: 'object',
            default: { recursive: true }
        },
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
        etcdOptions: {
            default: { wait: true, recursive: true },
            type: 'object'
        },
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
