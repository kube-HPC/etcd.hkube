const getTasksSchema = {
    "type": "object",
    "properties": {
        "etcdOptions": {
            "type": "object",
            "default": { recursive: true }
        },
        "index": {
            "default": null,
            "type": ["integer", "null"]
        },
        "suffix": {
            "default": '',
            "type": "string"
        },
        "jobId": {
            "type": "string"
        }
    }
}

const getSetTaskSchema = {
    "type": "object",
    "properties": {
        "data": {
            "default": {},
            "type": "object"
        },
        "jobId": {
            "type": "string"
        },
        "taskId": {
            "type": "string"
        },
        "suffix": {
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
            "type": ["integer", "null"]
        },
        "taskID": {
            "type": "string",
            "required": true
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
            "type": ["object", "any"]
        }
    }
}

module.exports = {
    getTasksSchema,
    getSetTaskSchema,
    watchSchema,
    jobResultsSchema
};