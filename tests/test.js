const { Etcd3 } = require('etcd3');
const { expect } = require('chai');
const sinon = require('sinon');
const delay = require('await-delay');
const uuidv4 = require('uuid/v4');
const Etcd = require('../index');
const { JobResult, JobStatus, Webhook, Watcher, Leaser } = require('../index');
const Discovery = require('../lib/entities/discovery/discovery');
const triggersTreeExpected = require('./mocks/triggers-tree.json');
const Semaphore = require('await-done').semaphore;

const client = new Etcd3({ hosts: 'http://localhost:4001' });
let etcd;
let _semaphore;
const SERVICE_NAME = 'my-test-service';
const config = { host: 'localhost', port: '4001', serviceName: SERVICE_NAME };

describe('Tests', () => {
    beforeEach(() => {
        etcd = new Etcd(config);
        _semaphore = new Semaphore();
    });
    describe('Discovery', () => {
        describe('crud', () => {
            it('should update data in discovery', async () => {
                const serviceName = `test-service-${uuidv4()}`;
                const instanceId = `register-test-${uuidv4()}`;
                const etcd = new Etcd({ ...config, serviceName });
                await etcd.discovery.register({ instanceId });
                let expected = { foo: 'bar' };
                await etcd.discovery.updateRegisteredData(expected);
                const path = `/discovery/${serviceName}/${instanceId}`;
                let actual = await etcd._client.get(path, { isPrefix: false });
                expect(actual).to.eql(expected);

                expected = { foofoo: 'barbar' };
                await etcd.discovery.updateRegisteredData(expected);
                actual = await etcd._client.get(path, { isPrefix: false });
                expect(actual).to.eql(expected);
            });
            it('should get data from discovery with serviceName', async () => {
                const serviceName = `test-service-${uuidv4()}`;
                const etcd = new Etcd({ ...config, serviceName });
                await etcd.discovery.register();
                const expected = { foonn: 'barrrr' };
                await etcd.discovery.updateRegisteredData(expected);
                const actual = await etcd.discovery.get();
                expect(actual).to.eql(expected);
            });
            it('should get prefix data from discovery with serviceName', async () => {
                const serviceName = `test-service-${uuidv4()}`;
                const instanceId = `register-test-${uuidv4()}`;
                const etcd = new Etcd({ ...config, serviceName });
                await etcd.discovery.register({ instanceId });
                const expected = { foo: 'bar' };
                await etcd.discovery.updateRegisteredData(expected);
                const actual = await etcd.discovery.get({ serviceName, instanceId });
                expect(actual).to.eql(expected);
            });
            it('should only able register once', async () => {
                const serviceName = `test-service-${uuidv4()}`;
                const etcd = new Etcd({ ...config, serviceName });
                const result1 = await etcd.discovery.register();
                const result2 = await etcd.discovery.register();
                const result3 = await etcd.discovery.register();
                expect(result1).to.be.not.null;
                expect(result2).to.be.null;
                expect(result3).to.be.null;
            });
            xit('should get prefix data from discovery with serviceName - multiple results', async () => {
                const serviceName = `test-service-${uuidv4()}`;
                const instanceId1 = `register-test-${uuidv4()}`;
                const instanceId2 = `register-test-${uuidv4()}`;
                const etcd1 = new Etcd({ ...config, serviceName });
                const etcd2 = new Etcd({ ...config, serviceName });
                const expected1 = { foo: 'bar' };
                const expected2 = { foo: 'baz' };
                await etcd1.discovery.register({ instanceId: instanceId1, data: expected1 });
                await etcd2.discovery.register({ instanceId: instanceId2, data: expected2 });

                const path = `/discovery/${serviceName}`;
                const actual = await etcd1._client.getByQuery(path);

                expect(actual).deep.include({ [`/discovery/test-service-4/${instanceId}`]: expected1 });
                expect(actual).deep.include({ [`/discovery/test-service-4/${instanceId2}`]: expected2 });
            });
            it('should get data from discovery without serviceName', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                const discovery = new Discovery({
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
                const discovery = new Discovery({
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
            it('should watch for after register', async () => {
                const instanceId = `my-instance-${uuidv4()}`;
                await etcd.discovery.watch({ instanceId });
                etcd.discovery.on('change', (res) => {
                    expect(res.instanceId).to.equal(instanceId);
                    _semaphore.callDone();
                });
                await etcd.discovery.register({ instanceId });
                await _semaphore.done();
                etcd.discovery.removeAllListeners();
            });
            it('should watch after set', async () => {
                const data1 = { data: [1, 2, 3, 4, 5] };
                const data2 = { data: [4, 5, 6] };
                await etcd.discovery.register({ data: data1 });
                await etcd.discovery.watch({ instanceId: etcd.discovery._instanceId });
                etcd.discovery.on('change', (res) => {
                    expect(res.instanceId).to.equal(etcd.discovery._instanceId);
                    expect(res.serviceName).to.equal(SERVICE_NAME);
                    expect(res.data).to.deep.equal(data2);
                    _semaphore.callDone();
                });
                await etcd.discovery.set({ instanceId: etcd.discovery._instanceId, serviceName: SERVICE_NAME, data: data2 });
                await _semaphore.done();
                etcd.discovery.removeAllListeners();
            });
        });
        describe('unwatch', () => {
            it('should unwatch', async () => {
                let isCalled = false;
                await etcd.discovery.watch();
                etcd.discovery.on('change', () => {
                    isCalled = true;
                });
                await etcd.discovery.unwatch();
                await etcd.discovery.register({});
                await delay(100);
                expect(isCalled).to.equal(false);
                etcd.discovery.removeAllListeners();
            });
        });
    });
    describe('Stress', () => {
        it('should put and get large object', async () => {
            const array = [];
            const size = 1000;
            for (let i = 0; i < size; i++) {
                array.push({ score: 70 });
            }
            await etcd._client.put('/test', array);
            const json = await etcd._client.get('/test');
            const result = JSON.parse(Object.values(json)[0]);
            expect(result).to.deep.equal(array);
        });
    });
    describe('Locks', () => {
        it('should acquire and release lock1', async () => {
            const key = `/locks/lock-${uuidv4()}`;
            const lock1 = await client.lock(key).acquire();
            await lock1.release();
            const lock2 = await client.lock(key).acquire();
            expect(lock2.key).to.equal(key);
        });
        it('should acquire and release lock2', async () => {
            const key = `/locks/lock-${uuidv4()}`;
            const etcd = new Etcd(config);
            const lock1 = await etcd._client.locker._acquireLock(key);
            await etcd._client.locker._releaseLock(lock1);
            const lock2 = await etcd._client.locker._acquireLock(key);
            expect(lock2.key).to.equal(key);
        });
    });
    describe('Lease', () => {
        it('should create lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            const leaser = new Leaser({ client });
            await leaser.create(10, key, value);
            const lease = await leaser.get(key);
            expect(lease).to.deep.equal(value);
        });
        it('should create lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            const leaser = new Leaser({ client });
            await leaser.create(10, key, value);
            const lease = await leaser.get(key);
            expect(lease).to.deep.equal(value);
        });
        it('should update lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value1 = { bla: 'bla1' };
            const value2 = { bla: 'bla2' };
            const leaser = new Leaser({ client });
            await leaser.create(10, key, value1);
            await leaser.update(value2);
            const lease = await leaser.get(key);
            expect(lease).to.deep.equal(value2);
        });
        it('should get leases', async () => {
            const key = `/leases`;
            const leaser = new Leaser({ client });
            const leases = await leaser.list(key);
            expect(leases).to.be.an('array');
        });
        it('should release lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            const leaser = new Leaser({ client });
            await leaser.create(10, key, value);
            const leaseBefore = await leaser.get(key);
            await leaser.release();
            const leaseAfter = await leaser.get(key);
            expect(leaseBefore).to.deep.equal(value);
            expect(leaseAfter).to.deep.equal(value);
        });
        it('should revoke lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            const leaser = new Leaser({ client });
            await leaser.create(10, key, value);
            const leaseBefore = await leaser.get(key);
            await leaser.revoke();
            const leaseAfter = await leaser.get(key);
            expect(leaseBefore).to.deep.equal(value);
            expect(leaseAfter).to.be.null;
        });
        it('should lost lease', async () => {
            const key = `/leases/lost-${uuidv4()}`;
            const value1 = { bla: 'bla1' };
            const value2 = { bla: 'bla2' };
            const leaser = new Leaser({ client });
            await leaser.create(10, key, value1);
            const lease1 = await leaser.get(key);
            const spy = sinon.spy(leaser, 'create');
            await leaser.revoke();
            await leaser.update(value2);
            await delay(100);
            const lease2 = await leaser.get(key);
            expect(spy.calledOnce).to.equal(true);
            expect(lease1).to.deep.equal(value1);
            expect(lease2).to.deep.equal(value2);
        });
    });
    describe('Transaction', () => {
        it('should do a transaction and swap keys', async () => {
            const key1 = 'transaction/key1';
            const key2 = 'transaction/key2';
            const value1 = 'value1';
            const value2 = 'value2';
            await etcd._client.put(key1, value1);
            await etcd._client.put(key2, value2);

            try {
                await client.stm({ retries: 0, isolation: 1 }).transact((tx) => {
                    return Promise.all([
                        tx.get(key1),
                        tx.get(key2),
                    ]).then(([val1, val2]) => {
                        return Promise.all([
                            tx.put(key1).value(value2),
                            tx.put(key2).value(value1)
                        ]);
                    });
                });
            }
            catch (e) {
                console.error(e);
            }
            const result1 = await etcd._client.get(key1);
            const result2 = await etcd._client.get(key2);
            expect(Object.values(result1)[0]).to.equal(value2);
            expect(Object.values(result2)[0]).to.equal(value1);
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
        it('should throw unable to find watcher', (done) => {
            const pathToWatch = 'path/not_exists';
            const watcher = new Watcher(etcd._client);
            watcher.unwatch(pathToWatch).catch((error) => {
                expect(error.message).to.equal(`unable to find watcher for ${pathToWatch}`);
                done();
            });
        });
        it('should register key and update ttl according to interval', async () => {
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

            expect(changeEvent.callCount).to.be.equal(1);
            expect(putEvent.callCount).to.be.equal(1);
            expect(deleteEvent.callCount).to.be.equal(0);
        });
    });
    describe('Get/Set', () => {
        it('etcd set and get simple test', async () => {
            const path = '/simple/test/path';
            const data = { bla: 'bla' };
            await etcd._client.put(path, data);
            const get1 = await etcd._client.get(path, { isPrefix: false });
            const get2 = await etcd._client.get(path, { isPrefix: true });
            expect(get1).to.eql(data);
            expect(get2).to.eql({ [path]: JSON.stringify(data) });
        });
        it('etcd sort with limit', async () => {
            const instanceId = `etcd-set-get-test-${uuidv4()}`;
            await etcd._client.put(`${instanceId}/1`, { val: 'val-1' });
            await etcd._client.put(`${instanceId}/2`, { val: 'val-2' });
            await etcd._client.put(`${instanceId}/3`, { val: 'val-3' });
            await etcd._client.put(`${instanceId}/4`, { val: 'val-4' });
            await etcd._client.put(`${instanceId}/5`, { val: 'val-5' });
            const data = await etcd._client.getSortLimit(`${instanceId}`, ['Mod', 'Ascend'], 3);
            expect(JSON.parse(data[Object.keys(data)[0]]).val).to.equal('val-1');
            expect(Object.keys(data).length).to.equal(3);
        });
    });
    describe('JobState', () => {
        describe('sets', () => {
            it('should set and get job state', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const state = 'started';
                await etcd.jobs.state.set({ data: state, jobId });
                const etcdGet = await etcd.jobs.state.get({ jobId });
                expect(etcdGet).to.equal(state);
            });
        });
        describe('watch', () => {
            it('should watch job state', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const state = 'started';
                await etcd.jobs.state.watch({ jobId });
                etcd.jobs.state.on('change', (res) => {
                    expect(res.state).to.equal(state);
                });
                etcd.jobs.state.set({ data: state, jobId });
            });
            it('should single watch for job change', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const state = 'started';
                const callback = sinon.spy();

                const etcd1 = new Etcd(config);
                const etcd2 = new Etcd(config);

                await etcd1.jobs.state.singleWatch({ jobId });
                etcd1.jobs.state.on('change', callback);

                await etcd2.jobs.state.singleWatch({ jobId });
                etcd2.jobs.state.on('change', callback);

                await etcd.jobs.state.set({ data: state, jobId });
                await delay(100);
                expect(callback.callCount).to.be.equal(1);
            });
            it('should watch stop state', async () => {
                const callback = sinon.spy();
                const jobId = `jobid-${uuidv4()}`;
                const state = 'cancel';
                const reason = 'jobs must be cancelled';
                const data = { state, reason };
                await etcd.jobs.state.watch({ jobId });
                etcd.jobs.state.on('change', (res) => {
                    expect(res.data.state).to.equal(state);
                    expect(res.data.reason).to.equal(reason);
                    callback();
                    _semaphore.callDone();
                });
                await etcd.jobs.state.set({ data, jobId });
                await _semaphore.done({ doneAmount: 1 });
                expect(callback.callCount).to.be.equal(1);
                etcd.jobs.state.removeAllListeners();
            });
            it('should watch stop all', async () => {
                const callback = sinon.spy();
                const state = 'stop';
                const reason = 'jobs must be stopped';
                const data = { state, reason };
                const jobId1 = `jobid-${uuidv4()}`;
                const jobId2 = `jobid-${uuidv4()}`;
                await etcd.jobs.state.watch();
                etcd.jobs.state.on('change', (res) => {
                    expect(res.data.state).to.equal(state);
                    expect(res.data.reason).to.equal(reason);
                    callback();
                    _semaphore.callDone();
                });
                await etcd.jobs.state.set({ data, jobId: jobId1 });
                await etcd.jobs.state.set({ data, jobId: jobId2 });
                await _semaphore.done({ doneAmount: 2 });
                expect(callback.callCount).to.be.equal(2);
                etcd.jobs.state.removeAllListeners();
            });
            it('should get watch object', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const state = 'started';
                await etcd.jobs.state.set({ jobId, data: state });
                const object = await etcd.jobs.state.watch({ jobId });
                expect(object).to.deep.equal(state);
            });
        });
        describe('unwatch', () => {
            it('should unwatch job state', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.state.watch({ jobId });
                etcd.jobs.state.on('change', () => {
                    isCalled = true;
                });
                await etcd.jobs.state.unwatch({ jobId });
                etcd.jobs.state.set({ data: state, jobId });
                await delay(100);
                expect(isCalled).to.equal(false);
                etcd.jobs.state.removeAllListeners();
            });
        });
    });
    describe('JobResults', () => {
        describe('crud', () => {
            it('should set and get results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobs.results.set({ jobId, data: new JobResult({ data }) });
                const etcdGet = await etcd.jobs.results.get({ jobId });
                expect(etcdGet.data).to.have.deep.keys(data);
            });
            it('should get results by name', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobs.results.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-2` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-3` });
                const list = await etcd.jobs.results.list({ jobId });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
                expect(list).to.have.lengthOf(3);
            });
            it('should get results by name,order', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const order = 'Mod';
                const data = { bla: 'bla' };
                await etcd.jobs.results.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-2` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-3` });
                const list = await etcd.jobs.results.list({ jobId, order });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
                expect(list).to.have.lengthOf(3);
                expect(every).to.equal(true);
            });
            it('should get results by name,order,sort', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const order = 'Mod';
                const sort = 'desc';
                const data = { bla: 'bla' };
                await etcd.jobs.results.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-2` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-3` });
                const list = await etcd.jobs.results.list({ jobId, order, sort });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
                expect(list).to.have.lengthOf(3);
                expect(every).to.equal(true);
            });
            it('should get results by name,order,sort,limit', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const order = 'Mod';
                const sort = 'desc';
                const limit = 3;
                const data = { bla: 'bla' };
                await etcd.jobs.results.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-2` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-3` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-4` });
                await etcd.jobs.results.set({ data, jobId: `${jobId}-5` });
                const list = await etcd.jobs.results.list({ jobId, order, sort, limit });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(list).to.have.lengthOf(limit);
                expect(every).to.equal(true);
            });
        });
        describe('watch', () => {
            it('should watch for change job results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobs.results.watch({ jobId });
                etcd.jobs.results.on('change', (res) => {
                    expect(res.data).to.deep.equal(data);
                    _semaphore.callDone();
                });
                await etcd.jobs.results.set({ jobId, data });
                await _semaphore.done();
            });
            it('should single watch for change job results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                const callback = sinon.spy();

                const etcd1 = new Etcd(config);
                const etcd2 = new Etcd(config);

                await etcd1.jobs.results.singleWatch({ jobId });
                etcd1.jobs.results.on('change', callback);

                await etcd2.jobs.results.singleWatch({ jobId });
                etcd2.jobs.results.on('change', callback);

                await etcd.jobs.results.set({ data, jobId });
                await delay(100);
                expect(callback.callCount).to.be.equal(1);
            });
            it('should watch for delete job results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobs.results.watch({ jobId });
                etcd.jobs.results.on('delete', (res) => {
                    expect(res.jobId).to.deep.equal(jobId);
                    _semaphore.callDone();
                });
                await etcd.jobs.results.set({ data, jobId });
                await etcd.jobs.results.delete({ jobId });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch job results', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.results.watch({ jobId });
                etcd.jobs.results.on('change', () => {
                    isCalled = true;
                });
                await etcd.jobs.results.unwatch({ jobId });
                etcd.jobs.results.set({ data: state, jobId });
                await delay(100);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('JobStatus', () => {
        describe('crud', () => {
            it('should set and get status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobs.status.set({ jobId, data: new JobStatus({ data }) });
                const etcdGet = await etcd.jobs.status.get({ jobId });
                expect(etcdGet.data).to.have.deep.keys(data);
            });
            it('should get status by name', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobs.status.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-2}` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-3` });
                const list = await etcd.jobs.status.list({ jobId });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(list).to.have.lengthOf(3);
                expect(every).to.equal(true);
            });
            it('should get status by name,order', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const order = 'Mod';
                const data = { bla: 'bla' };
                await etcd.jobs.status.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-2` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-3` });
                const list = await etcd.jobs.status.list({ jobId, order });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(list).to.have.lengthOf(3);
                expect(every).to.equal(true);
            });
            it('should get status by name,order,sort', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const order = 'Mod';
                const sort = 'desc';
                const data = { bla: 'bla' };
                await etcd.jobs.status.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-2` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-3` });
                const list = await etcd.jobs.status.list({ jobId, order, sort });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(list).to.have.lengthOf(3);
                expect(every).to.equal(true);
            });
            it('should get status by name,order,sort,limit', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const order = 'Mod';
                const sort = 'desc';
                const limit = 3;
                const data = { bla: 'bla' };
                await etcd.jobs.status.set({ data, jobId: `${jobId}-1` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-2` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-3` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-4` });
                await etcd.jobs.status.set({ data, jobId: `${jobId}-5` });
                const list = await etcd.jobs.status.list({ jobId, order, sort, limit });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(list).to.have.lengthOf(limit);
                expect(every).to.equal(true);
            });
            xit('should get executions tree', async () => {
                const prefix = '57ec5c39-122b-4d7c-bc8f-580ba30df511';
                await Promise.all([
                    etcd.jobs.status.set({ jobId: `${prefix}.a`, data: 'a' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c`, data: 'c' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d`, data: 'd' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.e`, data: 'e' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.e.f`, data: 'f' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.g`, data: 'g' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.h`, data: 'h' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.i`, data: 'i' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.h.j.k.l`, data: 'l' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.h.j.k.o`, data: 'o' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.c.d.h.j.k.p`, data: 'p' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.b.m`, data: 'm' }),
                    etcd.jobs.status.set({ jobId: `${prefix}.a.n`, data: 'n' })
                ]);
                const result = await etcd.jobs.status.getExecutionsTree({ jobId: `${prefix}.a` });
                expect(result).to.deep.equal(triggersTreeExpected);
            });
        });
        describe('watch', () => {
            it('should watch job status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { status: 'completed' };
                await etcd.jobs.status.watch({ jobId });
                etcd.jobs.status.on('change', (res) => {
                    expect(res.jobId).to.deep.equal(jobId);
                    expect(res.data).to.deep.equal(data);
                    _semaphore.callDone();
                });
                await etcd.jobs.status.set({ data, jobId });
                await _semaphore.done();
            });
            it('should single watch for change job status', async () => {
                const jobId1 = `jobid-${uuidv4()}`;
                const jobId2 = `jobid-${uuidv4()}`;
                const data1 = { bla: 'bla1' };
                const data2 = { bla: 'bla2' };
                const callback = sinon.spy();

                const etcd1 = new Etcd(config);
                await etcd1.jobs.status.singleWatch();
                etcd1.jobs.status.on('change', callback);

                const etcd2 = new Etcd(config);
                await etcd2.jobs.status.singleWatch();
                etcd2.jobs.status.on('change', callback);

                await etcd.jobs.status.set({ data: data1, jobId: jobId1 });
                await etcd.jobs.status.set({ data: data2, jobId: jobId2 });
                await etcd.jobs.status.set({ data: data1, jobId: jobId1 });
                await etcd.jobs.status.set({ data: data2, jobId: jobId2 });

                await delay(100);

                expect(callback.callCount).to.be.equal(4);
            });
            it('should watch for delete job status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                await etcd.jobs.status.watch({ jobId });
                etcd.jobs.status.on('delete', (res) => {
                    expect(res.jobId).to.deep.equal(jobId);
                    _semaphore.callDone();
                });
                await etcd.jobs.status.set({ data, jobId });
                await etcd.jobs.status.delete({ jobId });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch job status', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.status.watch({ jobId });
                etcd.jobs.status.on('change', () => {
                    isCalled = true;
                });
                await etcd.jobs.status.unwatch({ jobId });
                await etcd.jobs.status.set({ data: state, jobId });
                await delay(100);
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
                const jobId = 'jobs-list';
                const pipelineStatus = 'pending';
                const order = 'Mod';
                const sort = 'asc';
                const limit = 3;
                await etcd.webhooks.set({ jobId: `${jobId}-1`, type: 'results', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: `${jobId}-2`, type: 'progress', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: `${jobId}-3`, type: 'error', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: `${jobId}-4`, type: 'step', data: new Webhook({ pipelineStatus }) });
                await etcd.webhooks.set({ jobId: `${jobId}-5`, type: 'bla', data: new Webhook({ pipelineStatus }) });
                const list = await etcd.webhooks.list({ jobId: 'jobs-list', order, sort, limit });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
                expect(list).to.have.lengthOf(limit);
            });
        });
        describe('watch', () => {
            it('should watch webhook results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                const webhook = new Webhook({ pipelineStatus });
                await etcd.webhooks.watch({ jobId });
                etcd.webhooks.on('change', (result) => {
                    expect(result).to.have.property('jobId');
                    expect(result.data).to.have.property('timestamp');
                    expect(result.data).to.have.property('pipelineStatus');
                    _semaphore.callDone();
                });
                await etcd.webhooks.set({ jobId, type, data: webhook });
                await _semaphore.done();
            });
            it('should watch webhook progress', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'progress';
                const webhook = new Webhook({ pipelineStatus });
                await etcd.webhooks.watch({ jobId });
                etcd.webhooks.on('change', (result) => {
                    expect(result).to.have.property('jobId');
                    expect(result.data).to.have.property('timestamp');
                    expect(result.data).to.have.property('pipelineStatus');
                    _semaphore.callDone();
                });
                await etcd.webhooks.set({ jobId, type, data: webhook });
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
                etcd.webhooks.on('change', () => {
                    isCalled = true;
                });
                await etcd.webhooks.unwatch({ jobId });
                await etcd.webhooks.set({ jobId, type, data: webhook });
                await delay(100);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('Workers', () => {
        describe('crud', () => {
            it('should set status', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.set({ workerId, data: status });
                const actual = await etcd.workers.get({ workerId });
                expect(actual).to.eql(status);
            });
            it('should delete specific worker', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.set({ workerId, data: status });
                await etcd.workers.delete({ workerId });
                const result = await etcd.workers.get({ workerId });
                expect(result).to.be.null;
            });
            it('should set error', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const error = { code: 'blah' };
                await etcd.workers.set({ workerId, data: error });
                const actual = await etcd.workers.get({ workerId });
                expect(actual).to.eql(error);
            });
        });
        describe('watch', () => {
            it('should watch key', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.watch({ workerId });
                etcd.workers.on('change', async (res) => {
                    expect(res.workerId).to.eql(workerId);
                    expect(res.data).to.eql(status);
                    await etcd.workers.unwatch({ workerId });
                    _semaphore.callDone();
                });
                await etcd.workers.set({ workerId, data: status });
                await _semaphore.done();
            });
            it('should return the set obj on watch', async () => {
                const workerId = `workerid-${uuidv4()}`;
                const status = { state: 'ready' };
                await etcd.workers.set({ workerId, data: status });
                const actual = await etcd.workers.watch({ workerId });
                expect(actual).to.eql(status);
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
            it('should set data', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.jobs.tasks.set({ jobId, taskId, data });
                const etcdGet = await etcd.jobs.tasks.get({ jobId, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should get job jobs.tasks', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId1 = `taskid-${uuidv4()}`;
                const taskId2 = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                await etcd.jobs.tasks.set({ jobId, taskId: taskId1, data });
                await etcd.jobs.tasks.set({ jobId, taskId: taskId2, data });
                const list = await etcd.jobs.tasks.list({ jobId });
                const every = list.every(l => l.jobId.startsWith(jobId));
                expect(every).to.equal(true);
                expect(list).to.have.lengthOf(2);
            });
            it('should delete specific task', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                await etcd.jobs.tasks.set({ jobId, taskId });
                await etcd.jobs.tasks.delete({ jobId, taskId });
                const result = await etcd.jobs.tasks.get({ jobId, taskId });
                expect(result).to.be.null;
            });
        });
        describe('watch', () => {
            it('should watch key', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.jobs.tasks.watch({ jobId, taskId });
                etcd.jobs.tasks.on('change', async (res) => {
                    expect(res.jobId).to.eql(jobId);
                    expect(res.taskId).to.eql(taskId);
                    expect(res.data).to.eql(data);
                    await etcd.jobs.tasks.unwatch({ jobId, taskId });
                    _semaphore.callDone();
                });
                await etcd.jobs.tasks.set({ jobId, taskId, data: { status: data.status, result: data.result } });
                await _semaphore.done();
            });
            it('should watch all keys', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.jobs.tasks.watch({ jobId });
                etcd.jobs.tasks.on('change', async (res) => {
                    expect(res.jobId).to.eql(jobId);
                    expect(res.taskId).to.eql(taskId);
                    expect(res.data).to.eql(data);
                    await etcd.jobs.tasks.unwatch({ jobId });
                    _semaphore.callDone();
                });
                await etcd.jobs.tasks.set({ jobId, taskId, data: { status: data.status, result: data.result } });
                await _semaphore.done();
            });
            it('should return the set obj on watch', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.jobs.tasks.set({ jobId, taskId, data: { status: data.status, result: data.result } });
                const watch = await etcd.jobs.tasks.watch({ jobId, taskId });
                expect(data).to.have.deep.keys(watch);
            });
            it('should throw error if watch already exists', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                await etcd.jobs.tasks.watch({ jobId, taskId });
                try {
                    await etcd.jobs.tasks.watch({ jobId, taskId });
                }
                catch (error) {
                    expect(error.message).to.equals(`already watching on /jobs/tasks/${jobId}/${taskId}`);
                }
            });
        });
        describe('unwatch', () => {
            it('should unwatch key', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.jobs.tasks.watch({ jobId, taskId });
                etcd.jobs.tasks.on('change', (res) => {
                    expect(data).to.have.deep.keys(res);
                });
                await etcd.jobs.tasks.unwatch({ jobId, taskId });
                await etcd.jobs.tasks.set({ jobId, taskId, data: { status: data.status, result: data.result } });
            });
        });
    });
    describe('Executions', () => {
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
                await etcd.executions.stored.set({ jobId, data });
                const result = await etcd.executions.stored.get({ jobId });
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
                await etcd.executions.stored.set({ jobId, data });
                await etcd.executions.stored.delete({ jobId });
                const result = await etcd.executions.stored.get({ jobId });
                expect(result).to.be.null;
            });
        });
        describe('watch', () => {
            it('should watch execution', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                await etcd.executions.stored.watch({ jobId });
                etcd.executions.stored.on('change', (res) => {
                    expect(res.jobId).to.deep.equal(jobId);
                    expect(res.data).to.deep.equal(data);
                    _semaphore.callDone();
                });
                await etcd.executions.stored.set({ data, jobId });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch execution', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.executions.stored.watch({ jobId });
                etcd.jobs.results.on('change', () => {
                    isCalled = true;
                });
                await etcd.executions.stored.unwatch({ jobId });
                await etcd.executions.stored.set({ data: state, jobId });
                await delay(100);
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
                const name = 'pipeline-list';
                const data = { bla: 'bla' };
                await etcd.pipelines.set({ name: `${name}-1`, data });
                await etcd.pipelines.set({ name: `${name}-2`, data });
                const list = await etcd.pipelines.list({ name });
                const every = list.every(l => l.name.startsWith(name));
                expect(every).to.equal(true);
                expect(list).to.have.lengthOf(2);
            });
        });
        describe('watch', () => {
            it('should watch set specific pipeline', async () => {
                const name = 'pipeline-watch';
                const data = { name, bla: 'bla' };
                await etcd.pipelines.watch({ name });
                etcd.pipelines.on('change', (res) => {
                    expect(res.name).to.eql(name);
                    expect(res.data).to.eql(data);
                    _semaphore.callDone();
                });
                await etcd.pipelines.set({ name, data });
                await _semaphore.done();
            });
            it('should single watch queue', async () => {
                const options = { name: 'single-watch-alg', data: 'bla' };
                const callback = sinon.spy();

                const etcd1 = new Etcd(config);
                const etcd2 = new Etcd(config);

                await etcd1.pipelines.singleWatch(options);
                etcd1.pipelines.on('change', callback);

                await etcd2.pipelines.singleWatch(options);
                etcd2.pipelines.on('change', callback);

                await etcd.pipelines.set(options);
                await delay(200);
                expect(callback.callCount).to.be.equal(1);
            });
            it('should watch delete specific pipeline', async () => {
                const name = 'pipeline-2';
                const data = { name, bla: 'bla' };
                await etcd.pipelines.watch({ name });
                etcd.pipelines.on('delete', (res) => {
                    expect(res.name).to.eql(name);
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
                    expect(res.name).to.eql(name);
                    expect(res.data).to.eql(data);
                    _semaphore.callDone();
                });
                await etcd.pipelines.set({ name, data });
                await _semaphore.done();
            });
        });
    });
    describe('Algorithms', () => {
        describe('Store', () => {
            describe('crud', () => {
                it('should get/set specific store', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.store.set(options);
                    const etcdGet = await etcd.algorithms.store.get(options);
                    expect(etcdGet).to.equal(options.data);
                });
                it('should delete specific store', async () => {
                    const options = { name: 'delete-alg', data: 'bla' };
                    await etcd.algorithms.store.set(options);
                    const deleteRes = await etcd.algorithms.store.delete(options);
                    const getRes = await etcd.algorithms.store.get(options);
                    expect(getRes).to.be.null;
                });
                it('should get store list', async () => {
                    const name = 'list';
                    const data = { name, data: 'bla' }
                    await etcd.algorithms.store.set({ name: `${name}-1-alg`, data });
                    await etcd.algorithms.store.set({ name: `${name}-2-alg`, data });
                    const list = await etcd.algorithms.store.list({ name });
                    const every = list.every(l => l.name.startsWith(name));
                    expect(every).to.equal(true);
                    expect(list).to.have.lengthOf(2);
                });
            });
            describe('watch', () => {
                it('should watch change store', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.store.watch(options);
                    etcd.algorithms.store.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.store.set(options);
                    await _semaphore.done();
                });
                it('should single watch store', async () => {
                    const options = { name: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.algorithms.store.singleWatch(options);
                    etcd1.algorithms.store.on('change', callback);

                    await etcd2.algorithms.store.singleWatch(options);
                    etcd2.algorithms.store.on('change', callback);

                    await etcd.algorithms.store.set(options);
                    await delay(100);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete store', async () => {
                    const options = { name: 'delete-green-alg', data: 'bla' };
                    await etcd.algorithms.store.watch(options);
                    etcd.algorithms.store.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.store.set(options);
                    await etcd.algorithms.store.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const options = { name: 'blue-alg', data: 'bla' };
                    await etcd.algorithms.store.set(options);
                    const etcdGet = await etcd.algorithms.store.watch(options);
                    expect(etcdGet).to.eql(options.data);
                });
                it('should watch all store', async () => {
                    const options = { name: 'yellow-alg', data: 'bla' };
                    await etcd.algorithms.store.watch();
                    etcd.algorithms.store.on('change', (res) => {
                        etcd.algorithms.store.unwatch();
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.store.set(options);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific store', async () => {
                    let isCalled = false;
                    const options = { name: 'black-alg', data: 'bla' };
                    await etcd.algorithms.store.watch(options);
                    etcd.algorithms.store.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.algorithms.store.unwatch(options);
                    await etcd.algorithms.store.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
        describe('Requirements', () => {
            describe('crud', () => {
                it('should get/set specific resourceRequirement', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.requirements.set(options);
                    const etcdGet = await etcd.algorithms.requirements.get(options);
                    expect(etcdGet).to.equal(options.data);
                });
                it('should delete specific resourceRequirement', async () => {
                    const options = { name: 'delete-alg', data: 'bla' };
                    await etcd.algorithms.requirements.set(options);
                    await etcd.algorithms.requirements.delete(options);
                    const etcdGet = await etcd.algorithms.requirements.get(options);
                    expect(etcdGet).to.be.null;
                });
                it('should get all resourceRequirements', async () => {
                    const name = 'list';
                    await etcd.algorithms.requirements.set({ name: `${name}-1-alg`, data: 'bla' });
                    await etcd.algorithms.requirements.set({ name: `${name}-2-alg`, data: 'bla' });
                    const list = await etcd.algorithms.requirements.list({ name });
                    const every = list.every(l => l.name.startsWith(name));
                    expect(every).to.equal(true);
                    expect(list).to.have.lengthOf(2);
                });
            });
            describe('watch', () => {
                it('should watch change resourceRequirements', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.requirements.watch(options);
                    etcd.algorithms.requirements.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.requirements.set(options);
                    await _semaphore.done();
                });
                it('should single watch queue', async () => {
                    const options = { name: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.algorithms.requirements.singleWatch(options);
                    etcd1.algorithms.requirements.on('change', callback);

                    await etcd2.algorithms.requirements.singleWatch(options);
                    etcd2.algorithms.requirements.on('change', callback);

                    await etcd.algorithms.requirements.set(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete resourceRequirements', async () => {
                    const options = { name: 'delete-green-alg' };
                    await etcd.algorithms.requirements.watch(options);
                    etcd.algorithms.requirements.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.requirements.set(options);
                    await etcd.algorithms.requirements.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const options = { name: 'blue-alg', data: 'bla' };
                    await etcd.algorithms.requirements.set(options);
                    const etcdGet = await etcd.algorithms.requirements.watch(options);
                    expect(etcdGet).to.eql(options.data);
                });
                it('should watch all resourceRequirements', async () => {
                    const options2 = { name: 'yellow-alg', data: 'bla' };
                    await etcd.algorithms.requirements.watch();
                    etcd.algorithms.requirements.on('change', (res) => {
                        etcd.algorithms.requirements.unwatch();
                        expect(res).to.deep.equal(options2);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.requirements.set(options2);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific resourceRequirements', async () => {
                    let isCalled = false;
                    const options = { name: 'black-alg', data: 'bla' };
                    await etcd.algorithms.requirements.watch(options);
                    etcd.algorithms.requirements.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.algorithms.requirements.unwatch(options);
                    await etcd.algorithms.requirements.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
        describe('Queue', () => {
            describe('crud', () => {
                it('should get and set specific algorithmQueue', async () => {
                    const options = { name: 'get-alg', data: 'bla' };
                    await etcd.algorithms.queue.set(options);
                    const etcdGet = await etcd.algorithms.queue.get(options);
                    expect(etcdGet).to.eql(options.data);
                });
                it('should delete specific algorithmQueue', async () => {
                    const options = { name: 'delete-alg', data: 'bla' };
                    await etcd.algorithms.queue.set(options);
                    await etcd.algorithms.queue.delete(options);
                    const etcdGet = await etcd.algorithms.queue.get(options);
                    expect(etcdGet).to.be.null;
                });
                it('should get algorithmQueue list', async () => {
                    const name = 'list';
                    await etcd.algorithms.queue.set({ name: `${name}-1-alg`, data: 'bla' });
                    await etcd.algorithms.queue.set({ name: `${name}-2-alg`, data: 'bla' });
                    const list = await etcd.algorithms.queue.list({ name });
                    expect(list).to.have.lengthOf(2);
                });
            });
            describe('watch', () => {
                it('should watch change algorithmQueue', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.queue.watch(options);
                    etcd.algorithms.queue.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.queue.set(options);
                    await _semaphore.done();
                });
                it('should single watch queue', async () => {
                    const options = { name: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.algorithms.queue.singleWatch(options);
                    etcd1.algorithms.queue.on('change', callback);

                    await etcd2.algorithms.queue.singleWatch(options);
                    etcd2.algorithms.queue.on('change', callback);

                    await etcd.algorithms.queue.set(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete algorithmQueue', async () => {
                    const options = { name: 'delete-green-alg' };
                    await etcd.algorithms.queue.watch(options);
                    etcd.algorithms.queue.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.queue.set(options);
                    await etcd.algorithms.queue.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const options = { name: 'blue-alg', data: 'bla' };
                    await etcd.algorithms.queue.set(options);
                    const etcdGet = await etcd.algorithms.queue.watch(options);
                    expect(etcdGet).to.eql(options.data);
                });
                it('should watch all algorithmQueue', async () => {
                    const options = { name: 'yellow-alg', data: 'bla' };
                    await etcd.algorithms.queue.watch();
                    etcd.algorithms.queue.on('change', (res) => {
                        etcd.algorithms.queue.unwatch();
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.queue.set(options);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific algorithmQueue', async () => {
                    let isCalled = false;
                    const options = { name: 'black-alg', data: 'bla' };
                    await etcd.algorithms.queue.watch(options);
                    etcd.algorithms.queue.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.algorithms.queue.unwatch(options);
                    await etcd.algorithms.queue.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
    });
    describe('PipelineDrives', () => {
        describe('TemplatesStore', () => {
            describe('crud', () => {
                it('should get/set specific store', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.set(options);
                    const etcdGet = await etcd.pipelineDrivers.store.get(options);
                    expect(etcdGet).to.equal(options.data);
                });
                it('should delete specific store', async () => {
                    const options = { name: 'delete-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.set(options);
                    await etcd.pipelineDrivers.store.delete(options);
                    const getRes = await etcd.pipelineDrivers.store.get(options);
                    expect(getRes).to.be.null;
                });
                it('should get store list', async () => {
                    const name = 'list';
                    const options1 = { name: 'list-1-alg', data: 'bla' };
                    const options2 = { name: 'list-2-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.set(options1);
                    await etcd.pipelineDrivers.store.set(options2);
                    const list = await etcd.pipelineDrivers.store.list({ name });
                    expect(list).to.have.lengthOf(2);
                });
            });
            describe('watch', () => {
                it('should watch change store', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.watch(options);
                    etcd.pipelineDrivers.store.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.pipelineDrivers.store.set(options);
                    await _semaphore.done();
                });
                it('should single watch store', async () => {
                    const options = { name: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.pipelineDrivers.store.singleWatch(options);
                    etcd1.pipelineDrivers.store.on('change', callback);

                    await etcd2.pipelineDrivers.store.singleWatch(options);
                    etcd2.pipelineDrivers.store.on('change', callback);

                    await etcd.pipelineDrivers.store.set(options);
                    await delay(100);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete store', async () => {
                    const options = { name: 'delete-green-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.watch(options);
                    etcd.pipelineDrivers.store.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.pipelineDrivers.store.set(options);
                    await etcd.pipelineDrivers.store.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const options = { name: 'blue-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.set(options);
                    const etcdGet = await etcd.pipelineDrivers.store.watch(options);
                    expect(etcdGet).to.eql(options.data);
                });
                it('should watch all store', async () => {
                    const options2 = { name: 'yellow-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.watch();
                    etcd.pipelineDrivers.store.on('change', (res) => {
                        etcd.pipelineDrivers.store.unwatch();
                        expect(res).to.deep.equal(options2);
                        _semaphore.callDone();
                    });
                    await etcd.pipelineDrivers.store.set(options2);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific store', async () => {
                    let isCalled = false;
                    const options = { name: 'black-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.watch(options);
                    etcd.pipelineDrivers.store.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.pipelineDrivers.store.unwatch(options);
                    await etcd.pipelineDrivers.store.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
        describe('ResourceRequirements', () => {
            describe('crud', () => {
                it('should get/set specific resourceRequirement', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.pipelineDrivers.requirements.set(options);
                    const etcdGet = await etcd.pipelineDrivers.requirements.get(options);
                    expect(etcdGet).to.equal(options.data);
                });
                it('should delete specific resourceRequirement', async () => {
                    const options = { name: 'delete-alg', data: 'bla' };
                    await etcd.pipelineDrivers.requirements.set(options);
                    await etcd.pipelineDrivers.requirements.delete(options);
                    const etcdGet = await etcd.pipelineDrivers.requirements.get(options);
                    expect(etcdGet).to.be.null;
                });
                it('should get all resourceRequirements', async () => {
                    const name = 'list';
                    await etcd.pipelineDrivers.requirements.set({ name: `${name}-1-alg`, data: 'bla' });
                    await etcd.pipelineDrivers.requirements.set({ name: `${name}-2-alg`, data: 'bla' });
                    const list = await etcd.pipelineDrivers.requirements.list({ name: 'list' });
                    const every = list.every(l => l.name.startsWith(name));
                    expect(every).to.equal(true);
                    expect(list).to.have.lengthOf(2);
                });
            });
            describe('watch', () => {
                it('should watch change resourceRequirements', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.pipelineDrivers.requirements.watch(options);
                    etcd.pipelineDrivers.requirements.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.pipelineDrivers.requirements.set(options);
                    await _semaphore.done();
                });
                it('should single watch queue', async () => {
                    const options = { name: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.pipelineDrivers.requirements.singleWatch(options);
                    etcd1.pipelineDrivers.requirements.on('change', callback);

                    await etcd2.pipelineDrivers.requirements.singleWatch(options);
                    etcd2.pipelineDrivers.requirements.on('change', callback);

                    await etcd.pipelineDrivers.requirements.set(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete resourceRequirements', async () => {
                    const options = { name: 'delete-green-alg' };
                    await etcd.pipelineDrivers.requirements.watch(options);
                    etcd.pipelineDrivers.requirements.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.pipelineDrivers.requirements.set(options);
                    await etcd.pipelineDrivers.requirements.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const options = { name: 'blue-alg', data: 'bla' };
                    await etcd.pipelineDrivers.requirements.set(options);
                    const etcdGet = await etcd.pipelineDrivers.requirements.watch(options);
                    expect(etcdGet).to.eql(options.data);
                });
                it('should watch all resourceRequirements', async () => {
                    const options2 = { name: 'yellow-alg', data: 'bla' };
                    await etcd.pipelineDrivers.requirements.watch();
                    etcd.pipelineDrivers.requirements.on('change', (res) => {
                        etcd.pipelineDrivers.requirements.unwatch();
                        expect(res).to.deep.equal(options2);
                        _semaphore.callDone();
                    });
                    await etcd.pipelineDrivers.requirements.set(options2);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific resourceRequirements', async () => {
                    let isCalled = false;
                    const options = { name: 'black-alg', data: 'bla' };
                    await etcd.pipelineDrivers.requirements.watch(options);
                    etcd.pipelineDrivers.requirements.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.pipelineDrivers.requirements.unwatch(options);
                    await etcd.pipelineDrivers.requirements.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
        describe('Queue', () => {
            describe('crud', () => {
                it('should get/set specific queue', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.pipelineDrivers.queue.set(options);
                    const etcdGet = await etcd.pipelineDrivers.queue.get(options);
                    expect(etcdGet).to.deep.equal(options.data);
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
                it('should single watch queue', async () => {
                    const options = { name: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.pipelineDrivers.queue.singleWatch(options);
                    etcd1.pipelineDrivers.queue.on('change', callback);

                    await etcd2.pipelineDrivers.queue.singleWatch(options);
                    etcd2.pipelineDrivers.queue.on('change', callback);

                    await etcd.pipelineDrivers.queue.set(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete queue', async () => {
                    const options = { name: 'delete-green-alg' };
                    await etcd.pipelineDrivers.queue.watch(options);
                    etcd.pipelineDrivers.queue.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
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
                    expect(etcdGet).to.eql(options.data);
                });
                it('should watch all queue', async () => {
                    const options = { name: 'yellow-alg', data: 'bla' };
                    await etcd.pipelineDrivers.queue.watch();
                    etcd.pipelineDrivers.queue.on('change', (res) => {
                        etcd.pipelineDrivers.queue.unwatch();
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.pipelineDrivers.queue.set(options);
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
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
    });
});
