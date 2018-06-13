const { expect } = require('chai');
const sinon = require('sinon');
const delay = require('await-delay');
const uuidv4 = require('uuid/v4');
const Etcd = require('../index');
const { JobResult, JobStatus, Webhook } = require('../index');
const Discovery = require('../lib/discovery/discovery');
const triggersTreeExpected = require('./mocks/triggers-tree.json');
const Watcher = require('../lib/watch/watcher');
const Semaphore = require('await-done').semaphore;
let etcd, _semaphore;
const SERVICE_NAME = 'my-test-service';

describe('etcd', () => {
    beforeEach(() => {
        etcd = new Etcd();
        etcd.init({ etcd: { host: 'localhost', port: 4001 }, serviceName: SERVICE_NAME });
        _semaphore = new Semaphore();
    });
    describe('Discovery', () => {
        describe('crud', () => {
            it('should update data in discovery', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                const discovery = new Discovery();
                await discovery.init({
                    serviceName: 'test-service-1',
                    instanceId,
                    client: etcd._client
                });
                await discovery.register({});
                let expected = { foo: 'bar' };
                await discovery.updateRegisteredData(expected);
                const path = `/discovery/test-service-1/${instanceId}`;
                let actual = await etcd._client.get(path);
                expect(JSON.parse(actual[path])).to.eql(expected);

                expected = { foofoo: 'barbar' };
                await discovery.updateRegisteredData(expected);
                actual = await etcd._client.get(path);
                expect(JSON.parse(actual[path])).to.eql(expected);
            });
            it('should get data from discovery with serviceName', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                const discovery = new Discovery();
                await discovery.init({
                    serviceName: 'test-service-2',
                    instanceId,
                    client: etcd._client
                });
                await discovery.register();
                const expected = { foo: 'bar' };
                await discovery.updateRegisteredData(expected);
                const actual = await discovery.get({
                    serviceName: 'test-service-2',
                    prefix: 'test-service',
                    instanceId
                });
                expect(actual).to.eql(expected);
            });
            it('should get prefix data from discovery with serviceName', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                const discovery = new Discovery();
                await discovery.init({
                    serviceName: 'test-service-3',
                    instanceId,
                    client: etcd._client
                });
                await discovery.register({});
                const expected = { foo: 'bar' };
                await discovery.updateRegisteredData(expected);

                const actual = await discovery.get({
                    serviceName: 'test-service-3'
                });
                expect(actual).deep.include({ [`/discovery/test-service-3/${instanceId}`]: expected });
            });
            it('should get prefix data from discovery with serviceName - multiple results', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                const discovery = new Discovery();
                await discovery.init({
                    serviceName: 'test-service-4',
                    instanceId,
                    client: etcd._client
                });
                await discovery.register({});
                const expected = { foo: 'bar' };
                await discovery.updateRegisteredData(expected);

                const etcd2 = new Etcd();
                await etcd2.init({ etcd: { host: 'localhost', port: 4001 }, serviceName: SERVICE_NAME });
                const instanceId2 = `register-test-${uuidv4()}`;

                const discovery2 = new Discovery();
                await discovery2.init({
                    serviceName: 'test-service-4',
                    instanceId: instanceId2,
                    client: etcd2._client
                });
                await discovery2.register({});
                await discovery2.updateRegisteredData({ foo: 'baz' });

                const actual = await discovery.get({
                    serviceName: 'test-service-4'
                });
                expect(actual).deep.include({ [`/discovery/test-service-4/${instanceId}`]: expected });
                expect(actual).deep.include({ [`/discovery/test-service-4/${instanceId2}`]: { foo: 'baz' } });
            });
            it('should get data from discovery without serviceName', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                const discovery = new Discovery();
                await discovery.init({
                    serviceName: 'test-service',
                    instanceId,
                    client: etcd._client
                });
                await discovery.register({});
                const expected = { foo: 'bar' };
                await discovery.updateRegisteredData(expected);
                const actual = await discovery.get({
                    prefix: 'test-service',
                    instanceId
                });
                expect(actual).to.eql(expected);
            });
            it('should get data from discovery with wrong serviceName', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                const discovery = new Discovery();
                await discovery.init({
                    serviceName: 'test-service-5',
                    instanceId,
                    client: etcd._client
                });
                await discovery.register({});
                const expected = { foo: 'bar' };
                await discovery.updateRegisteredData(expected);
                const actual = await discovery.get({
                    serviceName: 'test-service-wrong',
                    prefix: 'test-service',
                    instanceId
                });
                expect(actual).to.be.null;
            });
        });
        describe('watch', () => {
            it('should watch for change job results', async () => {
                await etcd.discovery.watch();
                etcd.discovery.on('change', (res) => {
                    expect(res.jobId).to.equal(SERVICE_NAME);
                    _semaphore.callDone();
                });
                await etcd.discovery.register({ instanceId: 's' });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch job results', async () => {
                let isCalled = false;
                await etcd.discovery.watch();
                etcd.discovery.on('change', () => {
                    isCalled = true;
                });
                await etcd.discovery.unwatch();
                await etcd.discovery.register({});
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('Watch', () => {
        it('should throw already watching on', () => {
            return new Promise(async (resolve) => {
                const pathToWatch = 'path/not_exists';
                const watcher = new Watcher(etcd._client);
                await watcher.watch(pathToWatch);
                watcher.watch(pathToWatch).catch((error) => {
                    expect(error.message).to.equal(`already watching on ${pathToWatch}`);
                    resolve();
                });
            });
        });
        it('should throw already watching on', (done) => {
            const pathToWatch = 'path/not_exists';
            const watcher = new Watcher(etcd._client);
            watcher.unwatch(pathToWatch).catch((error) => {
                expect(error.message).to.equal(`unable to find watcher for ${pathToWatch}`);
                done();
            });
        });
        it('should register key and update ttl according to interval', async () => {
            const instanceId = `register-test-${uuidv4()}`;
            const pathToWatch = 'path/to/watch';
            const watcher = new Watcher(etcd._client);
            const putEvent = sinon.spy();
            const changeEvent = sinon.spy();
            const deleteEvent = sinon.spy();
            const watch = await watcher.watch(pathToWatch);
            expect(watch).to.have.property('watcher');
            expect(watch).to.have.property('data');
            watch.watcher.on('disconnected', () => console.log('disconnected...'));
            watch.watcher.on('connected', () => console.log('successfully reconnected!'));
            watch.watcher.on('put', (res) => {
                putEvent();
            });
            watch.watcher.on('delete', (res) => {
                deleteEvent();
            });
            watch.watcher.on('data', () => {
                changeEvent();
                _semaphore.callDone();
            });
            await etcd._client.put(pathToWatch, { data: 'bla' });
            await _semaphore.done({ doneAmount: 1 });
            watch.watcher.removeAllListeners();

            expect(changeEvent.callCount).to.be.equal(1);
            expect(putEvent.callCount).to.be.equal(1);
            expect(deleteEvent.callCount).to.be.equal(0);
        });
    });
    describe('Get/Set', () => {
        it('etcd set and get simple test', async () => {
            const instanceId = `etcd-set-get-test-${uuidv4()}`;
            const data = { data: { bla: 'bla' } };
            await etcd.services.client.set({ data, instanceId });
            const etcdGet = await etcd.services.client.get({ instanceId, prefix: 'services' });
            expect(etcdGet.data).to.have.deep.keys(data.data);
        });
        it('etcd sort with limit', async () => {
            const instanceId = `etcd-set-get-test-${uuidv4()}`;
            for (let i = 0; i < 10; i++) {
                await etcd._client.put(`${instanceId}/${i}`, { val: `val${i}` }, null);
                await delay(100);
            }
            await delay(200);
            const data = await etcd._client.getSortLimit(`${instanceId}`, ['Mod', 'Ascend'], 6);
            expect(JSON.parse(data[Object.keys(data)[0]]).val).to.equal('val0');
            expect(Object.keys(data).length).to.equal(6);
        });
    });
    describe('Services', () => {
        describe('get/set', () => {
            it('should get without specific instanceId', async () => {
                const data = { data: { bla: 'bla' } };
                await etcd.services.client.set(data);
                const etcdGet = await etcd.services.client.get({ prefix: 'services' });
                expect(etcdGet).to.have.deep.keys(data.data);
            });
            it('should get without specific instanceId with suffix', async () => {
                const suffix = 'test';
                const data = { data: { bla: 'bla' } };
                await etcd.services.client.set({ data, suffix });
                const etcdGet = await etcd.services.client.get({ prefix: 'services', suffix });
                expect(etcdGet.data).to.have.deep.keys(data.data);
            });
        });
        describe('pipeline-driver', () => {
            it('should set and get tasks', async () => {
                const { pipelineDriver } = etcd.services;
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await pipelineDriver.setTaskState({ jobId, taskId, data });
                const etcdGet = await pipelineDriver.getTaskState({ jobId, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should get list', async () => {
                const { pipelineDriver } = etcd.services;
                const taskId = `taskid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await pipelineDriver.setTaskState({ taskId, data });
                const etcdGet = await pipelineDriver.getDriverTasks({ taskId });
                expect(etcdGet[Object.keys(etcdGet)[0]]).to.have.deep.keys({ taskId, ...data });
            });
            it('should delete state', async () => {
                const { pipelineDriver } = etcd.services;
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await pipelineDriver.setState({ jobId, data });
                await pipelineDriver.deleteState({ jobId });
                const etcdGet = await pipelineDriver.getState({ jobId });
                expect(etcdGet).to.be.null;
            });
        });
        describe('algorithm-queue', () => {
            it('get', async () => {
                const { algorithmQueue } = etcd.services;
                const name = `algorithm-x-${uuidv4()}`;
                const queue = { bla: 'bla' };
                await algorithmQueue.store({ name, queue });
                const etcdGet = await algorithmQueue.get({ name });
                expect(etcdGet).to.have.deep.keys(queue);
            });
            it('store', async () => {
                const { algorithmQueue } = etcd.services;
                const name = `algorithm-x-${uuidv4()}`;
                const queue = { bla: 'bla' };
                await algorithmQueue.store({ name, queue });
                const etcdGet = await algorithmQueue.get({ name });
                expect(etcdGet).to.have.deep.keys(queue);
            });
        });
    });
    describe('Jobs', () => {
        describe('sets', () => {
            it('should set and get job state', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const state = 'started';
                await etcd.jobs.setState({ state, jobId });
                const etcdGet = await etcd.jobs.getState({ jobId });
                expect(etcdGet.state).to.equal(state);
            });
        });
        describe('watch', () => {
            it('should watch job state', async () => {
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.watch({ jobId });
                etcd.jobs.on('change', (res) => {
                    expect(res.state).to.equal(state);
                });
                etcd.jobs.setState({ state, jobId });
            });
            it('should watch stop state', async () => {
                const state = 'stop';
                const reason = 'jobs must be cancelled';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.watch({ jobId });
                etcd.jobs.on('change', (res) => {
                    expect(res.state).to.equal(state);
                    expect(res.reason).to.equal(reason);
                });
                etcd.jobs.stop({ reason, jobId });
            });
            it('should get watch object', async () => {
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.setState({ state, jobId });
                const object = await etcd.jobs.watch({ jobId });
                expect(object).to.deep.equal({ state });
            });
        });
        describe('unwatch', () => {
            it('should unwatch job state', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.watch({ jobId });
                etcd.jobs.on('change', () => {
                    isCalled = true;
                });
                await etcd.jobs.unwatch({ jobId });
                etcd.jobs.setState({ state, jobId });
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('JobResults', () => {
        describe('crud', () => {
            it('should set and get results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobResults.set({ jobId, data: new JobResult({ data }) });
                const etcdGet = await etcd.jobResults.get({ jobId });
                expect(etcdGet.data).to.have.deep.keys(data);
            });
            it('should get results by name', async () => {
                const jobId = 'name0';
                const data = { bla: 'bla' };
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                const list = await etcd.jobResults.list({ jobId });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
            });
            it('should get results by name,order', async () => {
                const jobId = 'name1';
                const order = 'Mod';
                const data = { bla: 'bla' };
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                const list = await etcd.jobResults.list({ jobId, order });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
            });
            it('should get results by name,order,sort', async () => {
                const jobId = 'name2';
                const order = 'Mod';
                const sort = 'desc';
                const data = { bla: 'bla' };
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}-${uuidv4()}` });
                const list = await etcd.jobResults.list({ jobId, order, sort });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
            });
            it('should get results by name,order,sort,limit', async () => {
                const jobId = 'name3';
                const order = 'Mod';
                const sort = 'desc';
                const limit = 3;
                const data = { bla: 'bla' };
                await etcd.jobResults.set({ data, jobId: `${jobId}1-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}2-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}3-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}4-${uuidv4()}` });
                await etcd.jobResults.set({ data, jobId: `${jobId}5-${uuidv4()}` });
                const list = await etcd.jobResults.list({ jobId, order, sort, limit });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(list).to.have.lengthOf(limit);
                expect(every).to.equal(true);
            });
        });
        describe('watch', () => {
            it('should watch for change job results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('change', (res) => {
                    expect(res).to.deep.equal(data);
                    _semaphore.callDone();
                });
                await etcd.jobResults.set({ data, jobId });
                await _semaphore.done();
            });
            it('should watch for delete job results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('delete', (res) => {
                    expect(res).to.deep.equal({ jobId });
                    _semaphore.callDone();
                });
                await etcd.jobResults.set({ data, jobId });
                await etcd.jobResults.delete({ jobId });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch job results', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('change', () => {
                    isCalled = true;
                });
                await etcd.jobResults.unwatch({ jobId });
                etcd.jobResults.set({ state, jobId });
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('JobStatus', () => {
        describe('crud', () => {
            it('should set and get status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobStatus.set({ jobId, data: new JobStatus({ data }) });
                const etcdGet = await etcd.jobStatus.get({ jobId });
                expect(etcdGet.data).to.have.deep.keys(data);
            });
            it('should get status by name', async () => {
                const jobId = 'name0';
                const data = { bla: 'bla' };
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                const list = await etcd.jobStatus.list({ jobId });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
            });
            it('should get status by name,order', async () => {
                const jobId = 'name1';
                const order = 'Mod';
                const data = { bla: 'bla' };
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                const list = await etcd.jobStatus.list({ jobId, order });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
            });
            it('should get status by name,order,sort', async () => {
                const jobId = 'name2';
                const order = 'Mod';
                const sort = 'desc';
                const data = { bla: 'bla' };
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}-${uuidv4()}` });
                const list = await etcd.jobStatus.list({ jobId, order, sort });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
            });
            it('should get status by name,order,sort,limit', async () => {
                const jobId = 'name3';
                const order = 'Mod';
                const sort = 'desc';
                const limit = 3;
                const data = { bla: 'bla' };
                await etcd.jobStatus.set({ data, jobId: `${jobId}1-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}2-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}3-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}4-${uuidv4()}` });
                await etcd.jobStatus.set({ data, jobId: `${jobId}5-${uuidv4()}` });
                const list = await etcd.jobStatus.list({ jobId, order, sort, limit });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(list).to.have.lengthOf(limit);
                expect(every).to.equal(true);
            });
        });
        describe('watch', () => {
            it('should watch job status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, status: 'completed' };
                await etcd.jobStatus.watch({ jobId });
                etcd.jobStatus.on('change', (res) => {
                    expect(res).to.deep.equal(data);
                    _semaphore.callDone();
                });
                etcd.jobStatus.set({ data, jobId });
                await _semaphore.done();
            });
            it('should watch for delete job status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                await etcd.jobStatus.watch({ jobId });
                etcd.jobStatus.on('delete', (res) => {
                    expect(res).to.deep.equal({ jobId });
                    _semaphore.callDone();
                });
                await etcd.jobStatus.set({ data, jobId });
                await etcd.jobStatus.delete({ jobId });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch job status', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobStatus.watch({ jobId });
                etcd.jobStatus.on('change', () => {
                    isCalled = true;
                });
                await etcd.jobStatus.unwatch({ jobId });
                etcd.jobStatus.set({ state, jobId });
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('Webhooks', () => {
        describe('crud', () => {
            it('should set and get webhook', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                await etcd.webhooks.set({ jobId, type, data: new Webhook({ pipelineStatus }) });
                const result = await etcd.webhooks.get({ jobId, type });
                expect(result).to.have.property('timestamp');
                expect(result).to.have.property('jobId');
                expect(result).to.have.property('pipelineStatus');
            });
            it('should delete specific webhook', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                await etcd.webhooks.set({ jobId, type, data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.delete({ jobId, type });
                const result = await etcd.webhooks.get({ jobId });
                expect(result).to.be.null;
            });
            it('should set and get webhook list', async () => {
                const pipelineStatus = 'pending';
                const order = 'Mod';
                const sort = 'asc';
                const limit = 3;
                await etcd.webhooks.set({ jobId: 'jobs-list-1', type: 'results', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: 'jobs-list-2', type: 'progress', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: 'jobs-list-3', type: 'error', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: 'jobs-list-4', type: 'step', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: 'jobs-list-5', type: 'bla', data: new Webhook({ pipelineStatus }) });
                const list = await etcd.webhooks.list({ jobId: 'jobs-list', order, sort, limit });
                expect(list).to.have.lengthOf(3);
            });
        });
        describe('watch', () => {
            it('should watch webhook results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                const webhook = new Webhook({ pipelineStatus });
                await etcd.webhooks.watch({ jobId });
                etcd.webhooks.on('results-change', (result) => {
                    expect(result).to.have.property('timestamp');
                    expect(result).to.have.property('jobId');
                    expect(result).to.have.property('pipelineStatus');
                    _semaphore.callDone();
                });
                etcd.webhooks.set({ jobId, type, data: webhook });
                await _semaphore.done();
            });
            it('should watch webhook progress', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'progress';
                const webhook = new Webhook({ pipelineStatus });
                await etcd.webhooks.watch({ jobId });
                etcd.webhooks.on('progress-change', (result) => {
                    expect(result).to.have.property('timestamp');
                    expect(result).to.have.property('jobId');
                    expect(result).to.have.property('pipelineStatus');
                    _semaphore.callDone();
                });
                etcd.webhooks.set({ jobId, type, data: webhook });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch webhook results', async () => {
                let isCalled = false;
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                const webhook = new Webhook({ pipelineStatus });
                await etcd.webhooks.watch({ jobId });
                etcd.webhooks.on('results-change', () => {
                    isCalled = true;
                });
                await etcd.webhooks.unwatch({ jobId });
                await etcd.webhooks.set({ jobId, type, data: webhook });
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('Workers', () => {
        describe('crud', () => {
            it('should set status', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.setState({ workerId, status });
                const actual = await etcd.workers.getState({ workerId });
                expect(actual).to.eql({ status });
            });
            it('should delete specific worker', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.setState({ workerId, status });
                await etcd.workers.delete({ workerId });
                const result = await etcd.workers.getState({ workerId });
                expect(result).to.be.null;
            });
            it('should set error', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const error = { code: 'blah' };
                await etcd.workers.setState({ workerId, error });
                const actual = await etcd.workers.getState({ workerId });
                expect(actual).to.eql({ error });
            });
        });
        describe('watch', () => {
            it('should watch key', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.watch({ workerId });
                etcd.workers.on('change', async (res) => {
                    expect(res).to.eql({ status, workerId });
                    await etcd.workers.unwatch({ workerId });
                    _semaphore.callDone();
                });
                await etcd.workers.setState({ workerId, status });
                await _semaphore.done();
            });
            it('should return the set obj on watch', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.setState({ workerId, status });
                const actual = await etcd.workers.watch({ workerId });
                expect(actual).to.eql({ status });
                await etcd.workers.unwatch({ workerId });
            });
            it('should throw error if watch on worker already exists', async () => {
                const workerId = `workerid-${uuidv4()}`;
                await etcd.workers.watch({ workerId });
                try {
                    await etcd.workers.watch({ workerId });
                }
                catch (error) {
                    expect(error.message).to.equals(`already watching on /workers/${workerId}`);
                    _semaphore.callDone();
                }
                await _semaphore.done();
            });
        });
    });
    describe('Tasks', () => {
        describe('crud', () => {
            const jobID = `jobid-${uuidv4()}`;
            it('should set results', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, result: data.result
                });
                const etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should set status', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, error: data.error
                });
                const etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should get jobs tasks', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, error: data.error
                });
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, error: data.error
                });
                const list = await etcd.tasks.list({ jobId: jobID });
                const task = list.values().next();
                expect(task.value).to.have.property('status');
            });
            it('should delete specific task', async () => {
                const taskId = `taskid-${uuidv4()}`;
                await etcd.tasks.setState({ jobId: jobID, taskId });
                await etcd.tasks.delete({ jobId: jobID, taskId });
                const result = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(result).to.be.null;
            });
        });
        describe('watch', () => {
            it('should watch key', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.watch({ jobId, taskId });
                etcd.tasks.on('change', async (res) => {
                    expect({ jobId, ...data, taskId }).to.have.deep.keys(res);
                    await etcd.tasks.unwatch({ jobId, taskId });
                    _semaphore.callDone();
                });
                etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
                await _semaphore.done();
            });
            it('should watch all keys', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.watch({ jobId });
                etcd.tasks.on('change', async (res) => {
                    const obj = { ...data, jobId, taskId };
                    expect(obj).to.have.deep.keys(res);
                    _semaphore.callDone();
                });
                etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
                await _semaphore.done();
            });
            it('should return the set obj on watch', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
                const watch = await etcd.tasks.watch({ jobId, taskId });
                expect(data).to.have.deep.keys(watch);
            });
            it('should throw error if watch already exists', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                await etcd.tasks.watch({ jobId, taskId });
                try {
                    await etcd.tasks.watch({ jobId, taskId });
                }
                catch (error) {
                    expect(error.message).to.equals(`already watching on /jobs/${jobId}/tasks/${taskId}`);
                }
            });
        });
        describe('unwatch', () => {
            it('should unwatch key', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.watch({ jobId, taskId });
                etcd.tasks.on('change', (res) => {
                    expect(data).to.have.deep.keys(res);
                });
                await etcd.tasks.unwatch({ jobId, taskId });
                etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
            });
        });
    });
    describe('Execution', () => {
        describe('crud', () => {
            it('should set and get execution', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = {
                    name: 'execution',
                    webhook: {
                        progressHook: 'string',
                        resultHook: 'string'
                    }
                };
                await etcd.execution.set({ jobId, data });
                const result = await etcd.execution.get({ jobId });
                expect(result).to.have.deep.keys(data);
            });
            it('should delete specific execution', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = {
                    name: 'execution',
                    webhook: {
                        progressHook: 'string',
                        resultHook: 'string'
                    }
                };
                await etcd.execution.set({ jobId, data });
                await etcd.execution.delete({ jobId });
                const result = await etcd.execution.get({ jobId });
                expect(result).to.be.null;
            });
            it('should get executions tree', async () => {
                const prefix = '57ec5c39-122b-4d7c-bc8f-580ba30df511';
                await Promise.all([
                    etcd.execution.set({ jobId: prefix + '.a', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.e', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.e.f', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.g', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.h', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.i', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.h.j.k.l', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.h.j.k.o', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.c.d.h.j.k.p', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.b.m', data: { startTime: Date.now() } }),
                    etcd.execution.set({ jobId: prefix + '.a.n', data: { startTime: Date.now() } })
                ]);
                const result = await etcd.execution.getExecutionsTree({ jobId: prefix + '.a' });
                expect(result).to.deep.equal(triggersTreeExpected);
            });
        });
        describe('watch', () => {
            it('should watch execution', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                await etcd.execution.watch({ jobId });
                etcd.execution.on('change', (res) => {
                    expect(res).to.deep.equal(data);
                    _semaphore.callDone();
                });
                etcd.execution.set({ data, jobId });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch execution', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.execution.watch({ jobId });
                etcd.jobResults.on('change', () => {
                    isCalled = true;
                });
                const res = await etcd.execution.unwatch({ jobId });
                etcd.execution.set({ state, jobId });
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('Pipelines', () => {
        describe('crud', () => {
            it('should set results', async () => {
                const name = 'pipeline-test';
                const data = { bla: 'bla' };
                await etcd.pipelines.set({ name, data });
                const etcdGet = await etcd.pipelines.get({ name });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should delete pipeline', async () => {
                const name = 'pipeline-delete';
                const data = { bla: 'bla' };
                await etcd.pipelines.set({ name, data });
                await etcd.pipelines.delete({ name });
                const etcdGet = await etcd.pipelines.get({ name });
                expect(etcdGet).to.be.null;
            });
            it('should get pipeline list', async () => {
                const name1 = 'pipeline-1';
                const name2 = 'pipeline-2';
                const data = { bla: 'bla' };
                await etcd.pipelines.set({ name: name1, data });
                await etcd.pipelines.set({ name: name2, data });
                const pipelines = await etcd.pipelines.list();
                expect(pipelines).to.be.an('array');
            });
        });
        describe('watch', () => {
            it('should watch set specific pipeline', async () => {
                const name = 'pipeline-2';
                const data = { name, bla: 'bla' };
                await etcd.pipelines.watch({ name });
                etcd.pipelines.on('change', (res) => {
                    expect(data).to.have.deep.keys(res);
                    _semaphore.callDone();
                });
                await etcd.pipelines.set({ name, data });
                await _semaphore.done();
            });
            it('should watch delete specific pipeline', async () => {
                const name = 'pipeline-2';
                const data = { name, bla: 'bla' };
                await etcd.pipelines.watch({ name });
                etcd.pipelines.on('delete', (res) => {
                    expect(res).to.have.deep.keys({ name });
                    _semaphore.callDone();
                });
                await etcd.pipelines.set({ name, data });
                await etcd.pipelines.delete({ name });
                await _semaphore.done();
            });
            it('should watch all pipelines', async () => {
                const name = 'pipeline-3';
                const data = { name, bla: 'bla' };
                await etcd.pipelines.watch();
                etcd.pipelines.on('change', (res) => {
                    etcd.pipelines.unwatch();
                    expect(data).to.have.deep.keys(res);
                    _semaphore.callDone();
                });
                await etcd.pipelines.set({ name, data });
                await _semaphore.done();
            });
        });
    });
    describe('AlgorithmQueue', () => {
        describe('crud', () => {
            it('should get and set specific algorithmQueue', async () => {
                const options = { name: 'get-alg', data: 'bla' };
                await etcd.algorithms.algorithmQueue.set(options);
                const etcdGet = await etcd.algorithms.algorithmQueue.get(options);
                expect(etcdGet).to.deep.equal(options);
            });
            it('should delete specific algorithmQueue', async () => {
                const options = { name: 'delete-alg', data: 'bla' };
                await etcd.algorithms.algorithmQueue.set(options);
                await etcd.algorithms.algorithmQueue.delete(options);
                const etcdGet = await etcd.algorithms.algorithmQueue.get(options);
                expect(etcdGet).to.be.null;
            });
            it('should get algorithmQueue list', async () => {
                const options1 = { name: 'list-1-alg', data: 'bla' };
                const options2 = { name: 'list-2-alg', data: 'bla' };
                await etcd.algorithms.algorithmQueue.set(options1);
                await etcd.algorithms.algorithmQueue.set(options2);
                const list = await etcd.algorithms.algorithmQueue.list({ name: 'list' });
                expect(list).to.have.lengthOf(2);
            });
        });
        describe('watch', () => {
            it('should watch change algorithmQueue', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.algorithms.algorithmQueue.watch(options);
                etcd.algorithms.algorithmQueue.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.algorithms.algorithmQueue.set(options);
                await _semaphore.done();
            });
            it('should watch delete algorithmQueue', async () => {
                const options = { name: 'delete-green-alg' };
                await etcd.algorithms.algorithmQueue.watch(options);
                etcd.algorithms.algorithmQueue.on('delete', (res) => {
                    expect(res).to.deep.equal({ name: 'delete-green-alg' });
                    _semaphore.callDone();
                });
                await etcd.algorithms.algorithmQueue.set(options);
                await etcd.algorithms.algorithmQueue.delete(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { name: 'blue-alg', data: 'bla' };
                await etcd.algorithms.algorithmQueue.set(options);
                const etcdGet = await etcd.algorithms.algorithmQueue.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all algorithmQueue', async () => {
                const options2 = { name: 'yellow-alg', data: 'bla' };
                await etcd.algorithms.algorithmQueue.watch();
                etcd.algorithms.algorithmQueue.on('change', (res) => {
                    etcd.algorithms.algorithmQueue.unwatch();
                    expect(res).to.deep.equal(options2);
                    _semaphore.callDone();
                });
                await etcd.algorithms.algorithmQueue.set(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific algorithmQueue', async () => {
                let isCalled = false;
                const options = { name: 'black-alg', data: 'bla' };
                await etcd.algorithms.algorithmQueue.watch(options);
                etcd.algorithms.algorithmQueue.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.algorithms.algorithmQueue.unwatch(options);
                await etcd.algorithms.algorithmQueue.set(options);
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('ResourceRequirements', () => {
        describe('crud', () => {
            it('should get/set specific resourceRequirement', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.set(options);
                const etcdGet = await etcd.algorithms.resourceRequirements.get(options);
                expect(etcdGet).to.equal(options.data);
            });
            it('should delete specific resourceRequirement', async () => {
                const options = { name: 'delete-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.set(options);
                await etcd.algorithms.resourceRequirements.delete(options);
                const etcdGet = await etcd.algorithms.resourceRequirements.get(options);
                expect(etcdGet).to.be.null;
            });
            it('should get all resourceRequirements', async () => {
                const options1 = { name: 'list-1-alg', data: 'bla' };
                const options2 = { name: 'list-2-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.set(options1);
                await etcd.algorithms.resourceRequirements.set(options2);
                const list = await etcd.algorithms.resourceRequirements.list({ name: 'list' });
                expect(list).to.have.lengthOf(2);
            });
        });
        describe('watch', () => {
            it('should watch change resourceRequirements', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.watch(options);
                etcd.algorithms.resourceRequirements.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.algorithms.resourceRequirements.set(options);
                await _semaphore.done();
            });
            it('should watch delete resourceRequirements', async () => {
                const options = { name: 'delete-green-alg' };
                await etcd.algorithms.resourceRequirements.watch(options);
                etcd.algorithms.resourceRequirements.on('delete', (res) => {
                    expect(res).to.deep.equal({ name: 'delete-green-alg' });
                    _semaphore.callDone();
                });
                await etcd.algorithms.resourceRequirements.set(options);
                await etcd.algorithms.resourceRequirements.delete(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { name: 'blue-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.set(options);
                const etcdGet = await etcd.algorithms.resourceRequirements.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all resourceRequirements', async () => {
                const options2 = { name: 'yellow-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.watch();
                etcd.algorithms.resourceRequirements.on('change', (res) => {
                    etcd.algorithms.resourceRequirements.unwatch();
                    expect(res).to.deep.equal(options2);
                    _semaphore.callDone();
                });
                await etcd.algorithms.resourceRequirements.set(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific resourceRequirements', async () => {
                let isCalled = false;
                const options = { name: 'black-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.watch(options);
                etcd.algorithms.resourceRequirements.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.algorithms.resourceRequirements.unwatch(options);
                await etcd.algorithms.resourceRequirements.set(options);
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('PipelineDriverRequirements', () => {
        describe('crud', () => {
            it('should get/set specific resourceRequirement', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.pipelineDrivers.resourceRequirements.set(options);
                const etcdGet = await etcd.pipelineDrivers.resourceRequirements.get(options);
                expect(etcdGet).to.equal(options.data);
            });
            it('should delete specific resourceRequirement', async () => {
                const options = { name: 'delete-alg', data: 'bla' };
                await etcd.pipelineDrivers.resourceRequirements.set(options);
                await etcd.pipelineDrivers.resourceRequirements.delete(options);
                const etcdGet = await etcd.pipelineDrivers.resourceRequirements.get(options);
                expect(etcdGet).to.be.null;
            });
            it('should get all resourceRequirements', async () => {
                const options1 = { name: 'list-1-alg', data: 'bla' };
                const options2 = { name: 'list-2-alg', data: 'bla' };
                await etcd.pipelineDrivers.resourceRequirements.set(options1);
                await etcd.pipelineDrivers.resourceRequirements.set(options2);
                const list = await etcd.pipelineDrivers.resourceRequirements.list({ name: 'list' });
                expect(list).to.have.lengthOf(2);
            });
        });
        describe('watch', () => {
            it('should watch change resourceRequirements', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.pipelineDrivers.resourceRequirements.watch(options);
                etcd.pipelineDrivers.resourceRequirements.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.pipelineDrivers.resourceRequirements.set(options);
                await _semaphore.done();
            });
            it('should watch delete resourceRequirements', async () => {
                const options = { name: 'delete-green-alg' };
                await etcd.pipelineDrivers.resourceRequirements.watch(options);
                etcd.pipelineDrivers.resourceRequirements.on('delete', (res) => {
                    expect(res).to.deep.equal({ name: 'delete-green-alg' });
                    _semaphore.callDone();
                });
                await etcd.pipelineDrivers.resourceRequirements.set(options);
                await etcd.pipelineDrivers.resourceRequirements.delete(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { name: 'blue-alg', data: 'bla' };
                await etcd.pipelineDrivers.resourceRequirements.set(options);
                const etcdGet = await etcd.pipelineDrivers.resourceRequirements.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all resourceRequirements', async () => {
                const options2 = { name: 'yellow-alg', data: 'bla' };
                await etcd.pipelineDrivers.resourceRequirements.watch();
                etcd.pipelineDrivers.resourceRequirements.on('change', (res) => {
                    etcd.pipelineDrivers.resourceRequirements.unwatch();
                    expect(res).to.deep.equal(options2);
                    _semaphore.callDone();
                });
                await etcd.pipelineDrivers.resourceRequirements.set(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific resourceRequirements', async () => {
                let isCalled = false;
                const options = { name: 'black-alg', data: 'bla' };
                await etcd.pipelineDrivers.resourceRequirements.watch(options);
                etcd.pipelineDrivers.resourceRequirements.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.pipelineDrivers.resourceRequirements.unwatch(options);
                await etcd.pipelineDrivers.resourceRequirements.set(options);
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('PipelineDriverQueue', () => {
        describe('crud', () => {
            it('should get/set specific queue', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.pipelineDrivers.queue.set(options);
                const etcdGet = await etcd.pipelineDrivers.queue.get(options);
                expect(etcdGet).to.deep.equal(options);
            });
            it('should delete specific queue', async () => {
                const options = { name: 'delete-alg', data: 'bla' };
                await etcd.pipelineDrivers.queue.set(options);
                await etcd.pipelineDrivers.queue.delete(options);
                const etcdGet = await etcd.pipelineDrivers.queue.get(options);
                expect(etcdGet).to.be.null;
            });
            it('should get all queue', async () => {
                const options1 = { name: 'list-1-alg', data: 'bla' };
                const options2 = { name: 'list-2-alg', data: 'bla' };
                await etcd.pipelineDrivers.queue.set(options1);
                await etcd.pipelineDrivers.queue.set(options2);
                const list = await etcd.pipelineDrivers.queue.list({ name: 'list' });
                expect(list).to.have.lengthOf(2);
            });
        });
        describe('watch', () => {
            it('should watch change queue', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.pipelineDrivers.queue.watch(options);
                etcd.pipelineDrivers.queue.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.pipelineDrivers.queue.set(options);
                await _semaphore.done();
            });
            it('should watch delete queue', async () => {
                const options = { name: 'delete-green-alg' };
                await etcd.pipelineDrivers.queue.watch(options);
                etcd.pipelineDrivers.queue.on('delete', (res) => {
                    expect(res).to.deep.equal({ name: 'delete-green-alg' });
                    _semaphore.callDone();
                });
                await etcd.pipelineDrivers.queue.set(options);
                await etcd.pipelineDrivers.queue.delete(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { name: 'blue-alg', data: 'bla' };
                await etcd.pipelineDrivers.queue.set(options);
                const etcdGet = await etcd.pipelineDrivers.queue.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all queue', async () => {
                const options2 = { name: 'yellow-alg', data: 'bla' };
                await etcd.pipelineDrivers.queue.watch();
                etcd.pipelineDrivers.queue.on('change', (res) => {
                    etcd.pipelineDrivers.queue.unwatch();
                    expect(res).to.deep.equal(options2);
                    _semaphore.callDone();
                });
                await etcd.pipelineDrivers.queue.set(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific queue', async () => {
                let isCalled = false;
                const options = { name: 'black-alg', data: 'bla' };
                await etcd.pipelineDrivers.queue.watch(options);
                etcd.pipelineDrivers.queue.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.pipelineDrivers.queue.unwatch(options);
                await etcd.pipelineDrivers.queue.set(options);
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('TemplatesStore', () => {
        describe('crud', () => {
            it('should get/set specific templatesStore', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.set(options);
                const etcdGet = await etcd.algorithms.templatesStore.get(options);
                expect(etcdGet).to.equal(options.data);
            });
            it('should delete specific templatesStore', async () => {
                const options = { name: 'delete-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.set(options);
                const deleteRes = await etcd.algorithms.templatesStore.delete(options);
                const getRes = await etcd.algorithms.templatesStore.get(options);
                expect(getRes).to.be.null;
            });
            it('should get templatesStore list', async () => {
                const options1 = { name: 'list-1-alg', data: 'bla' };
                const options2 = { name: 'list-2-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.set(options1);
                await etcd.algorithms.templatesStore.set(options2);
                const list = await etcd.algorithms.templatesStore.list({ name: 'list' });
                expect(list).to.have.lengthOf(2);
            });
        });
        describe('watch', () => {
            it('should watch change templatesStore', async () => {
                const options = { name: 'green-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.watch(options);
                etcd.algorithms.templatesStore.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.algorithms.templatesStore.set(options);
                await _semaphore.done();
            });
            it('should watch delete templatesStore', async () => {
                const options = { name: 'delete-green-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.watch(options);
                etcd.algorithms.templatesStore.on('delete', (res) => {
                    expect(res).to.deep.equal({ name: 'delete-green-alg' });
                    _semaphore.callDone();
                });
                await etcd.algorithms.templatesStore.set(options);
                await etcd.algorithms.templatesStore.delete(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { name: 'blue-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.set(options);
                const etcdGet = await etcd.algorithms.templatesStore.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all templatesStore', async () => {
                const options2 = { name: 'yellow-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.watch();
                etcd.algorithms.templatesStore.on('change', (res) => {
                    etcd.algorithms.templatesStore.unwatch();
                    expect(res).to.deep.equal(options2);
                    _semaphore.callDone();
                });
                await etcd.algorithms.templatesStore.set(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific templatesStore', async () => {
                let isCalled = false;
                const options = { name: 'black-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.watch(options);
                etcd.algorithms.templatesStore.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.algorithms.templatesStore.unwatch(options);
                await etcd.algorithms.templatesStore.set(options);
                await delay(500);
                expect(isCalled).to.equal(false);
            });
        });
    });
});
