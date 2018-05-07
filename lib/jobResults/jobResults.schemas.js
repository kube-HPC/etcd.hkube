const getJobSchema = {
    type: 'object',
    properties: {
        suffix: {
            default: '',
            type: 'string'
        },
        jobId: {
            default: '',
            type: 'string'
        }
    }
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
            default: '',
            type: 'string',
        },
        suffix: {
            default: '',
            type: 'string'
        }
    }
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
