const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.JOB_STATUS;
const schemas = require('./schema');

class JobStatus extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    get(options) {
        return super.get(options);
    }

    set(options) {
        return super.set(options);
    }

    delete(options) {
        return super.delete(options);
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ jobId: l.jobId, ...l.value }));
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    async getExecutionsTree(options) {
        const list = await super.list(options);
        if (list.length === 0) {
            return null;
        }
        return this._parseTree(list);
    }

    _parseTree(list) {
        const result = [];
        const m = new Set();
        list.forEach((p) => {
            const s = p.jobId.split('.');
            let jobId = s[0] + '.';
            for (let i = 1; i < s.length; i += 1) {
                jobId = jobId + s[i] + '.';
                if (!m.has(jobId)) {
                    result.push({ name: s[i], jobId: jobId.substring(0, jobId.length - 1), parent: i === 1 ? 0 : s[i - 1] });
                    m.add(jobId);
                }
            }
        });
        return this._getNestedChildren(result, 0);
    }

    _getNestedChildren(arr, parent) {
        const out = [];
        for (let i = 0; i < arr.length; i += 1) {
            if (arr[i].parent === parent) {
                const children = this._getNestedChildren(arr, arr[i].name); // should not stop if parent found we want to check deep for each children

                if (children.length) { // if parent found add childrens
                    arr[i].children = children;
                }
                delete arr[i].parent;
                out.push(arr[i]);
            }
        }
        return out;
    }

    releaseChangeLock(options) {
        super.releaseChangeLock(options);
    }

    releaseDeleteLock(options) {
        super.releaseDeleteLock(options);
    }

    watch(options) {
        return super.watch(options);
    }

    unwatch(options) {
        return super.unwatch(options);
    }
}

module.exports = JobStatus;

