const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.STATUS;
const JobStatus = require('../entities/job-status');
const schemas = require('./schema');

class JobsStatus extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    set(options) {
        const data = new JobStatus(options);
        return super.set(data);
    }

    async getExecutionsTree(options) {
        const res = await super.get({ jobId: options.jobId }, { isPrefix: true });
        if (Object.keys(res).length === 0) return null;
        return this._parseTree(res);
    }

    _parseTree(res) {
        const result = [];
        const m = new Set();
        Object.keys(res).forEach((p) => {
            const s = p.split('.').map(x => x.replace('/jobs/status/', ''));
            let jobId = `${s[0]}.`;
            for (let i = 1; i < s.length; i += 1) {
                jobId = `${jobId}${s[i]}.`;
                if (!m.has(jobId)) {
                    result.push({ name: s[i], parent: i === 1 ? 0 : s[i - 1], jobId: jobId.substring(0, jobId.length - 1) });
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
                    arr[i].children = children; // eslint-disable-line
                }
                delete arr[i].parent; // eslint-disable-line
                out.push(arr[i]);
            }
        }
        return out;
    }
}

module.exports = JobsStatus;
