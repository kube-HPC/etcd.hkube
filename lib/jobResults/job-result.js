const moment = require('moment');
const JobStatusBase = require('./job-result-base');

class JobResult extends JobStatusBase {

    constructor(options) {
        super(options);
        this.reason = options.reason;
        this.timeTook = this._calcTimeTook(options.startTime);
    }

    _calcTimeTook(start) {
        const now = moment(Date.now());
        const startTime = moment(start);
        return now.diff(startTime, 'seconds', true);
    }
}

module.exports = JobResult;