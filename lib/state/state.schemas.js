const getStateSchema = {
    type: 'object',
    properties: {
        suffix: {
            default: 'state',
            type: 'string'
        },
        jobId: {
            type: 'string'
        },
       
    },
   
};

const getSetStateSchema = {
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
        jobId: {
            type: 'string'
        },
      
        suffix: {
            default: 'state',
            type: 'string'
        }
    },
    required: [
        'jobId',
        
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string',
            default: '',
        },
        prefix: {
            default: 'state',
            type: 'string'
        },
        suffix: {
            default: 'state',
            type: 'string'
        }
    }
};

module.exports = {
    getStateSchema,
    getSetStateSchema,
    watchSchema
};
