const getJobSchema = {
    type: 'object',
    properties: {
        etcdOptions: {
            type: 'object',
            default: { recursive: true }
        },
        suffix: {
            default: '',
            type: 'string'
        },
        jobId: {
            type: 'string'
        }
    },
    required: [
        'jobId'
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
        jobId: {
            type: 'string',
        },
        suffix: {
            default: '',
            type: 'string'
        }
    },
    required: [
        'jobId'
    ]
};

const jobResultsSchema = {
    type: 'object',
    properties: {
        etcdOptions: {
            type: 'object'
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
    }
};

module.exports = {
    getJobSchema,
    watchSchema,
    jobResultsSchema
};
