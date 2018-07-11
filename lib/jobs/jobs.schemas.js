const jobsSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        suffix: {
            type: 'string',
            default: 'state'
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
    // required: [
    //     'jobId'
    // ]
};

module.exports = {
    jobsSchema
};
