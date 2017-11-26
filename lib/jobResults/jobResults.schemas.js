const getJobSchema = {
    "type": "object",
    "properties": {
        "etcdOptions": {
            "type": "object",
            "default": { recursive: true }
        },
        "suffix": {
            "default": '',
            "type": "string"
        },
        "jobId": {
            "default": '',
            "type": "string"
        }
    }
}

const watchSchema = {
    "type": "object",
    "properties": {
        "etcdOptions": {
            "default": { wait: true, recursive: true },
            "type": "object"
        },
        "index": {
            "default": null,
            "anyOf": [
                {
                    "type": [
                        "integer",
                        "null"
                    ]
                }
            ]
        },
        "jobId": {
            "default": '',
            "type": "string",
        },
        "suffix": {
            "default": '',
            "type": "string"
        }
    }
}

const jobResultsSchema = {
    "type": "object",
    "properties": {
        "etcdOptions": {
            "type": "object"
        },
        "data": {
            "default": null,
            "anyOf": [
                {
                    "type": [
                        "object",
                        "string",
                        "null"
                    ]
                }
            ]
        }
    }
}

module.exports = {
    getJobSchema,
    watchSchema,
    jobResultsSchema
};
