const getJobSchema = {
    type: 'object',
    properties: {
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
            default: 'state',
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
