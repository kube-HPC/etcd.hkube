const getTasksSchema = {
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
            "required": true,
            "type": "string"
        },
        "taskId": {
            "default": '',
            "type": "string"
        }
    }
}

const getSetTaskSchema = {
    "type": "object",
    "properties": {
        "data": {
            "default": {},
            "type": ["object", "any"]
        },
        "jobId": {
            "required": true,
            "type": "string"
        },
        "taskId": {
            "required": true,
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
        "jobId": {
            "required": true,
            "type": "string"
        },
        "taskID": {
            "required": true,
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
