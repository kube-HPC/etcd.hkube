const { expect } = require('chai');
const sinon = require('sinon');
const delay = require('await-delay');
const { uuid: uuidv4 } = require('@hkube/uid');
const Etcd = require('../index');
const triggersTreeExpected = require('./mocks/triggers-tree.json');
const Semaphore = require('await-done').semaphore;

let etcd;
let _semaphore;
const SERVICE_NAME = 'my-test-service';
const config = { host: 'localhost', port: '4001', serviceName: SERVICE_NAME };

//TODO: Split tests to files

describe('Tests', () => {
    before(async () => {
        etcd = new Etcd(config);
        await etcd._client.client.delete().all();
    });
    beforeEach(() => {
        etcd = new Etcd(config);
        _semaphore = new Semaphore();
    });
    describe('Init', () => {
        it('should set timeout timeout', async () => {
            const etcd1 = new Etcd({ ...config, timeout: 20000 });
            const now = Date.now();
            const { deadline } = etcd1._client.client.options.defaultCallOptions({ isStream: false });
            expect(deadline).to.be.within(now, now + 20000)
        })
        it('should ignore undefined timeout', async () => {
            const etcd1 = new Etcd({ ...config, timeout: 0 });
            const now = Date.now();
            const options = etcd1._client.client.options.defaultCallOptions({ isStream: false });
            expect(options).to.eql({})
        })
        it('should add clientOptions', async () => {
            const etcd1 = new Etcd({
                ...config,
                timeout: 0,
                clientOptions: { defaultCallOptions: () => ({ deadline: 10 }) }
            });
            const { deadline } = etcd1._client.client.options.defaultCallOptions({ isStream: false });
            expect(deadline).to.eql(10)
        })
    })
    describe('Stress', () => {
        it('should put and get large object', async () => {
            const array = [];
            const size = 1000;
            for (let i = 0; i < size; i++) {
                array.push({ score: 70 });
            }
            await etcd._client.put('/test/test', array);
            const json = await etcd._client.get('/test/test', { isPrefix: false });
            expect(json).to.deep.equal(array);
        });
        it('should put and get large number of keys', async function () {
            this.timeout(10000);
            const prefix = '/bigsizePrefix';
            const limit = 3000;
            const array = Array.from(Array(limit).keys());
            await Promise.all(array.map(a => etcd._client.put(`${prefix}/${a}`, { data: `value-${a}` })));
            const response = await etcd._client.getByQuery(`${prefix}`, { limit });
            expect(Object.keys(response)).to.have.lengthOf(limit);
        });
        it('should put and delete large number of keys', async function () {
            this.timeout(10000);
            const prefix = '/bigsizeDeletePrefix';
            const limit = 1000;
            const array = Array.from(Array(limit).keys());
            await Promise.all(array.map(a => etcd._client.put(`${prefix}/${a}`, { data: `value-${a}` })));
            const before = await etcd._client.getByQuery(`${prefix}`, { limit });
            expect(Object.keys(before)).to.have.lengthOf(limit);

            await etcd._client.delete(`${prefix}`, { isPrefix: true });
            const after = await etcd._client.getByQuery(`${prefix}`, { limit });
            expect(Object.keys(after)).to.have.lengthOf(0);
        });
    });
    describe('Locks', () => {
        it('should acquire and release locks', async () => {
            const key = `test-${uuidv4()}`;
            const lock1 = await etcd._client.locker.acquire(key);
            const lock2 = await etcd._client.locker.acquire(key);
            const lock3 = await etcd._client.locker.acquire(key);

            const release1 = await etcd._client.locker.release(key);
            const release2 = await etcd._client.locker.release(key);
            const release3 = await etcd._client.locker.release(key);

            expect(lock1.success).to.be.true;
            expect(lock2.success).to.be.false;
            expect(lock3.success).to.be.false;

            expect(release1.success).to.be.true;
            expect(release2.success).to.be.false;
            expect(release3.success).to.be.false;
        });
    });
    describe('Lease', () => {
        it('should create lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            await etcd._client.leaser.create(10, key, value);
            const lease = await etcd._client.leaser.get(key);
            expect(lease).to.deep.equal(value);
        });
        it('should create lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            await etcd._client.leaser.create(10, key, value);
            const lease = await etcd._client.leaser.get(key);
            expect(lease).to.deep.equal(value);
        });
        it('should update lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value1 = { bla: 'bla1' };
            const value2 = { bla: 'bla2' };
            await etcd._client.leaser.create(10, key, value1);
            await etcd._client.leaser.update(value2);
            const lease = await etcd._client.leaser.get(key);
            expect(lease).to.deep.equal(value2);
        });
        it('should get leases', async () => {
            const key = `/leases`;
            const leases = await etcd._client.leaser.list(key);
            expect(leases).to.be.an('array');
        });
        it('should release lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            await etcd._client.leaser.create(10, key, value);
            const leaseBefore = await etcd._client.leaser.get(key);
            await etcd._client.leaser.release();
            const leaseAfter = await etcd._client.leaser.get(key);
            expect(leaseBefore).to.deep.equal(value);
            expect(leaseAfter).to.deep.equal(value);
        });
        it('should revoke lease', async () => {
            const key = `/leases/lease-${uuidv4()}`;
            const value = { bla: 'bla' };
            await etcd._client.leaser.create(10, key, value);
            const leaseBefore = await etcd._client.leaser.get(key);
            await etcd._client.leaser.revoke();
            const leaseAfter = await etcd._client.leaser.get(key);
            expect(leaseBefore).to.deep.equal(value);
            expect(leaseAfter).to.be.null;
        });
        it('should lost lease', async () => {
            const key = `/leases/lost-${uuidv4()}`;
            const value1 = { bla: 'bla1' };
            const value2 = { bla: 'bla2' };
            await etcd._client.leaser.create(10, key, value1);
            const lease1 = await etcd._client.leaser.get(key);
            const spy = sinon.spy(etcd._client.leaser, 'create');
            await etcd._client.leaser.revoke();
            await etcd._client.leaser.update(value2);
            await delay(100);
            const lease2 = await etcd._client.leaser.get(key);
            expect(spy.calledOnce).to.equal(true);
            expect(lease1).to.deep.equal(value1);
            expect(lease2).to.deep.equal(value2);
        });
    });
    describe('Watch', () => {
        it('should throw already watching on', () => {
            return new Promise(async (resolve) => {
                const pathToWatch = 'path/not_exists';
                await etcd._client.watcher.watch(pathToWatch);
                etcd._client.watcher.watch(pathToWatch).catch((error) => {
                    expect(error.message).to.equal(`already watching on ${pathToWatch}`);
                    resolve();
                });
            });
        });
        it('should throw unable to find watcher', (done) => {
            const pathToWatch = 'path/not_exists';
            etcd._client.watcher.unwatch(pathToWatch).catch((error) => {
                expect(error.message).to.equal(`unable to find watcher for ${pathToWatch}`);
                done();
            });
        });
        it('should register key and update ttl according to interval', async () => {
            const pathToWatch = 'path/to/watch';
            const putEvent = sinon.spy();
            const changeEvent = sinon.spy();
            const deleteEvent = sinon.spy();
            const watch = await etcd._client.watcher.getAndWatch(pathToWatch);
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
        it('etcd list with invalid order', async () => {
            const instanceId = `etcd-list-${uuidv4()}`;
            await etcd._client.put(`${instanceId}/1`, { val: 'val-1' });
            await etcd._client.put(`${instanceId}/2`, { val: 'val-2' });
            await etcd._client.put(`${instanceId}/3`, { val: 'val-3' });
            const data = await etcd._client.getByQuery(`${instanceId}`, { order: 'No_Such', sort: 'asc' });
            expect(JSON.parse(data[Object.keys(data)[0]]).val).to.equal('val-1');
            expect(Object.keys(data).length).to.equal(3);
        });
    });
    describe('Algorithms', () => {
        describe('Builds', () => {
            describe('crud', () => {
                it('should throw validation error', () => {
                    return new Promise((resolve, reject) => {
                        const options = { nonProperty: 'green-alg' };
                        etcd.algorithms.builds.set(options).catch(e => {
                            expect(e.message).to.equal(`data should have required property 'buildId'`);
                            resolve();
                        });
                    });
                });
                it('should get/set specific build', async () => {
                    const options = { buildId: 'green-alg', data: 'bla' };
                    await etcd.algorithms.builds.set(options);
                    const etcdGet = await etcd.algorithms.builds.get(options);
                    expect(etcdGet).to.deep.equal(options);
                });
                it('should failed to update specific build', async () => {
                    const buildId = `build-${uuidv4()}`;
                    const options = { buildId, data: { newProp: 'bla' } };
                    const res = await etcd.algorithms.builds.update(options);
                    const etcdGet = await etcd.algorithms.builds.get(options);
                    expect(etcdGet).to.be.null;
                    expect(res).to.be.false;
                });
                it('should success to update specific build', async () => {
                    const buildId = `build-${uuidv4()}`;
                    const prop = 'bla';
                    const options = { buildId, data: { prop } };
                    await etcd.algorithms.builds.set(options);
                    const res = await etcd.algorithms.builds.update({ buildId, data: { newProp: prop } });
                    const etcdGet = await etcd.algorithms.builds.get(options);
                    expect(res).to.be.true;
                    expect(etcdGet.data).to.deep.equal({ prop, newProp: prop });
                });
                it('should success to update specific build with predicate', async () => {
                    const buildId = `build-${uuidv4()}`;
                    const prop = 'bla';
                    const options = { buildId, data: { prop } };
                    const newOptions = { buildId, data: { newProp: prop } };
                    await etcd.algorithms.builds.set(options);
                    const res = await etcd.algorithms.builds.update(newOptions, (b) => {
                        if (b.data.prop === prop) {
                            return { ...b, ...newOptions };
                        }
                        return null
                    });
                    const etcdGet = await etcd.algorithms.builds.get(options);
                    expect(res).to.be.true;
                    expect(etcdGet.data).to.deep.equal({ newProp: prop });
                });
                it('should failed to update specific build with predicate', async () => {
                    const buildId = `build-${uuidv4()}`;
                    const prop = 'bla';
                    const options = { buildId, data: { prop } };
                    await etcd.algorithms.builds.set(options);
                    const res = await etcd.algorithms.builds.update({ buildId, data: { newProp: prop } }, (b) => b.data.prop === 'no_such');
                    const etcdGet = await etcd.algorithms.builds.get(options);
                    expect(res).to.be.false;
                    expect(etcdGet.data).to.deep.equal({ prop });
                });
                it('should delete specific build', async () => {
                    const options = { buildId: 'delete-alg', data: 'bla' };
                    await etcd.algorithms.builds.set(options);
                    const deleteRes = await etcd.algorithms.builds.delete(options);
                    const getRes = await etcd.algorithms.builds.get(options);
                    expect(getRes).to.be.null;
                });
                it('should get builds list', async () => {
                    const name = 'list';
                    const data = { name, data: 'bla' };
                    await etcd.algorithms.builds.set({ buildId: `${name}-1-alg`, ...data });
                    await etcd.algorithms.builds.set({ buildId: `${name}-2-alg`, ...data });
                    const list = await etcd.algorithms.builds.list({ buildId: name });
                    const every = list.every(l => l.name.startsWith(name));
                    expect(every).to.equal(true);
                    expect(list).to.have.lengthOf(2);
                });
                it('should get builds list key count', async () => {
                    const name = 'list';
                    const data = { name, data: 'bla' };
                    await etcd.algorithms.builds.set({ buildId: `${name}-1-alg`, ...data });
                    await etcd.algorithms.builds.set({ buildId: `${name}-2-alg`, ...data });
                    await etcd.algorithms.builds.set({ buildId: `${name}-3-alg`, ...data });
                    const count = await etcd.algorithms.builds.count({ buildId: name });
                    expect(count).to.equal(3);
                });
                it('should get builds list keys only', async () => {
                    const name = 'list';
                    const data = { name, data: 'bla' };
                    await etcd.algorithms.builds.set({ buildId: `${name}-1-alg`, ...data });
                    await etcd.algorithms.builds.set({ buildId: `${name}-2-alg`, ...data });
                    await etcd.algorithms.builds.set({ buildId: `${name}-3-alg`, ...data });
                    const keys = await etcd.algorithms.builds.keys({ buildId: name });
                    expect(keys).to.have.lengthOf(3)
                    expect(keys).to.deep.include(`/algorithms/builds/${name}-1-alg`)
                    expect(keys).to.deep.include(`/algorithms/builds/${name}-2-alg`)
                    expect(keys).to.deep.include(`/algorithms/builds/${name}-3-alg`)
                });
            });
            describe('watch', () => {
                it('should watch change builds', async () => {
                    const options = { buildId: 'green-alg', data: 'bla' };
                    await etcd.algorithms.builds.watch(options);
                    etcd.algorithms.builds.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.builds.set(options);
                    await _semaphore.done();
                });
                it('should single watch builds', async () => {
                    const options = { buildId: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.algorithms.builds.singleWatch(options);
                    etcd1.algorithms.builds.on('change', callback);

                    await etcd2.algorithms.builds.singleWatch(options);
                    etcd2.algorithms.builds.on('change', callback);

                    await etcd.algorithms.builds.set(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should release change lock watch builds', async () => {
                    const options = { buildId: `release-${uuidv4()}`, data: 'bla' };
                    const callback = sinon.spy();
                    const etcdClient = new Etcd(config);

                    const my = {
                        async callback() {
                            const result = await etcdClient.algorithms.builds.releaseChangeLock(options);
                            callback();
                            _semaphore.callDone();
                        }
                    };

                    await etcdClient.algorithms.builds.singleWatch(options);
                    etcdClient.algorithms.builds.on('change', my.callback);
                    await etcd.algorithms.builds.set(options);
                    await _semaphore.done({ doneAmount: 1 });
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete builds', async () => {
                    const options = { buildId: 'delete-green-alg', data: 'bla' };
                    await etcd.algorithms.builds.watch(options);
                    etcd.algorithms.builds.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.builds.set(options);
                    await etcd.algorithms.builds.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const options = { buildId: 'blue-alg', data: 'bla' };
                    await etcd.algorithms.builds.set(options);
                    const etcdGet = await etcd.algorithms.builds.watch(options);
                    expect(etcdGet).to.eql(options);
                });
                it('should watch all builds', async () => {
                    const options = { buildId: 'yellow-alg', data: 'bla' };
                    await etcd.algorithms.builds.watch();
                    etcd.algorithms.builds.on('change', (res) => {
                        etcd.algorithms.builds.unwatch();
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.builds.set(options);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific builds', async () => {
                    let isCalled = false;
                    const options = { buildId: 'black-alg', data: 'bla' };
                    await etcd.algorithms.builds.watch(options);
                    etcd.algorithms.builds.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.algorithms.builds.unwatch(options);
                    await etcd.algorithms.builds.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
        describe('Debug', () => {
            describe('crud', () => {
                it('should throw validation error', () => {
                    return new Promise((resolve, reject) => {
                        const options = { nonProperty: 'green-alg' };
                        etcd.algorithms.debug.set(options).catch(e => {
                            expect(e.message).to.equal(`data should have required property 'name'`);
                            resolve();
                        });
                    });
                });
                it('should get/set specific debug', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.debug.set(options);
                    const etcdGet = await etcd.algorithms.debug.get(options);
                    expect(etcdGet).to.deep.equal(options);
                });
                it('should update specific debug', async () => {
                    const name = `debug-${uuidv4()}`;
                    const prop = 'bla';
                    const options = { name, data: { prop } };
                    await etcd.algorithms.debug.set(options);
                    await etcd.algorithms.debug.update({ name, data: { newProp: prop } });
                    const etcdGet = await etcd.algorithms.debug.get(options);
                    expect(etcdGet.data).to.deep.equal({ prop, newProp: prop });
                });
                it('should delete specific debug', async () => {
                    const options = { name: 'delete-alg', data: 'bla' };
                    await etcd.algorithms.debug.set(options);
                    const deleteRes = await etcd.algorithms.debug.delete(options);
                    const getRes = await etcd.algorithms.debug.get(options);
                    expect(getRes).to.be.null;
                });
                it('should get debug list', async () => {
                    const name = 'list';
                    const data = { name, data: 'bla' };
                    await etcd.algorithms.debug.set({ name: `${name}-1-alg`, data });
                    await etcd.algorithms.debug.set({ name: `${name}-2-alg`, data });
                    const list = await etcd.algorithms.debug.list({ name });
                    const every = list.every(l => l.name.startsWith(name));
                    expect(every).to.equal(true);
                    expect(list).to.have.lengthOf(2);
                });
                it('should get debug list key count', async () => {
                    const name = 'list';
                    const data = { name, data: 'bla' };
                    await etcd.algorithms.debug.set({ name: `${name}-1-alg`, data });
                    await etcd.algorithms.debug.set({ name: `${name}-2-alg`, data });
                    const count = await etcd.algorithms.debug.count({ name });
                    expect(count).to.equal(2);
                });
            });
            describe('watch', () => {
                it('should watch change debug', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.debug.watch(options);
                    etcd.algorithms.debug.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.debug.set(options);
                    await _semaphore.done();
                });
                it('should single watch debug', async () => {
                    const options = { name: 'single-watch-alg', data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.algorithms.debug.singleWatch(options);
                    etcd1.algorithms.debug.on('change', callback);

                    await etcd2.algorithms.debug.singleWatch(options);
                    etcd2.algorithms.debug.on('change', callback);

                    await etcd.algorithms.debug.set(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete debug', async () => {
                    const options = { name: 'delete-green-alg', data: 'bla' };
                    await etcd.algorithms.debug.watch(options);
                    etcd.algorithms.debug.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.debug.set(options);
                    await etcd.algorithms.debug.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const options = { name: 'blue-alg', data: 'bla' };
                    await etcd.algorithms.debug.set(options);
                    const etcdGet = await etcd.algorithms.debug.watch(options);
                    expect(etcdGet).to.eql(options);
                });
                it('should watch all debug', async () => {
                    const options = { name: 'yellow-alg', data: 'bla' };
                    await etcd.algorithms.debug.watch();
                    etcd.algorithms.debug.on('change', (res) => {
                        etcd.algorithms.debug.unwatch();
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.debug.set(options);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific debug', async () => {
                    let isCalled = false;
                    const options = { name: 'black-alg', data: 'bla' };
                    await etcd.algorithms.debug.watch(options);
                    etcd.algorithms.debug.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.algorithms.debug.unwatch(options);
                    await etcd.algorithms.debug.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
        describe('Executions', () => {
            describe('crud', () => {
                it('should throw validation error', () => {
                    return new Promise((resolve, reject) => {
                        const options = { nonProperty: 'green-alg' };
                        etcd.algorithms.executions.set(options).catch(e => {
                            expect(e.message).to.equal(`data should have required property 'jobId'`);
                            resolve();
                        });
                    });
                });
                it('should get/set specific execution', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    await etcd.algorithms.executions.set(options);
                    const etcdGet = await etcd.algorithms.executions.get(options);
                    expect(etcdGet).to.deep.equal(options);
                });
                it('should update specific execution', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const prop = 'bla';
                    const options = { jobId, taskId, data: { prop } };
                    await etcd.algorithms.executions.set(options);
                    await etcd.algorithms.executions.update({ jobId, taskId, data: { newProp: prop } });
                    const etcdGet = await etcd.algorithms.executions.get(options);
                    expect(etcdGet.data).to.deep.equal({ prop, newProp: prop });
                });
                it('should delete specific execution', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    await etcd.algorithms.executions.set(options);
                    await etcd.algorithms.executions.delete(options);
                    const getRes = await etcd.algorithms.executions.get(options);
                    expect(getRes).to.be.null;
                });
                it('should get execution list', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    await etcd.algorithms.executions.set({ jobId, taskId: `taskId-${uuidv4()}`, data: `bla-${uuidv4()}` });
                    await etcd.algorithms.executions.set({ jobId, taskId: `taskId-${uuidv4()}`, data: `bla-${uuidv4()}` });
                    const list = await etcd.algorithms.executions.list({ jobId });
                    const every = list.every(l => l.jobId === jobId);
                    expect(every).to.equal(true);
                    expect(list).to.have.lengthOf(2);
                });
                it('should get execution list key count', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    await etcd.algorithms.executions.set({ jobId, taskId: `taskId-${uuidv4()}`, data: `bla-${uuidv4()}` });
                    await etcd.algorithms.executions.set({ jobId, taskId: `taskId-${uuidv4()}`, data: `bla-${uuidv4()}` });
                    const count = await etcd.algorithms.executions.count({ jobId });
                    expect(count).to.eql(2);
                });
            });
            describe('watch', () => {
                it('should watch change executions', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    await etcd.algorithms.executions.watch(options);
                    etcd.algorithms.executions.on('change', (res) => {
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.executions.set(options);
                    await _semaphore.done();
                });
                it('should single watch executions', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.algorithms.executions.singleWatch(options);
                    etcd1.algorithms.executions.on('change', callback);

                    await etcd2.algorithms.executions.singleWatch(options);
                    etcd2.algorithms.executions.on('change', callback);

                    await etcd.algorithms.executions.set(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete executions', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    await etcd.algorithms.executions.watch(options);
                    etcd.algorithms.executions.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.executions.set(options);
                    await etcd.algorithms.executions.delete(options);
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    await etcd.algorithms.executions.set(options);
                    const etcdGet = await etcd.algorithms.executions.watch(options);
                    expect(etcdGet).to.eql(options);
                });
                it('should watch all executions', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    await etcd.algorithms.executions.watch();
                    etcd.algorithms.executions.on('change', (res) => {
                        etcd.algorithms.executions.unwatch();
                        expect(res).to.deep.equal(options);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.executions.set(options);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific executions', async () => {
                    let isCalled = false;
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskId-${uuidv4()}`;
                    const options = { jobId, taskId, data: 'bla' };
                    await etcd.algorithms.executions.watch(options);
                    etcd.algorithms.executions.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.algorithms.executions.unwatch(options);
                    await etcd.algorithms.executions.set(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
        describe('Store', () => {
            describe('crud', () => {
                it('should get/set specific store', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.store.set(options);
                    const etcdGet = await etcd.algorithms.store.get(options);
                    expect(etcdGet).to.deep.equal(options);
                });
                it('should update specific store', async () => {
                    const name = `store-${uuidv4()}`;
                    const prop = 'bla';
                    const options = { name, data: { prop } };
                    await etcd.algorithms.store.set(options);
                    await etcd.algorithms.store.update({ name, data: { newProp: prop } });
                    const etcdGet = await etcd.algorithms.store.get(options);
                    expect(etcdGet.data).to.deep.equal({ prop, newProp: prop });
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
                    await delay(200);
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
                    expect(etcdGet).to.eql(options);
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
                    expect(etcdGet).to.deep.equal(options);
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
                    expect(etcdGet).to.eql(options);
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
                    expect(etcdGet).to.eql(options);
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
                it('should get algorithmQueue list key count', async () => {
                    const name = 'list';
                    await etcd.algorithms.queue.set({ name: `${name}-1-alg`, data: 'bla' });
                    await etcd.algorithms.queue.set({ name: `${name}-2-alg`, data: 'bla' });
                    const count = await etcd.algorithms.queue.count({ name });
                    expect(count).to.equal(2);
                });
            });
            describe('watch', () => {
                it('should watch change algorithmQueue', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.algorithms.queue.watch(options);
                    etcd.algorithms.queue.on('change', async (res) => {
                        await etcd.algorithms.queue.unwatch(options);
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
                    expect(etcdGet).to.eql(options);
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
        describe('Versions', () => {
            const version = '1.0.0';
            describe('crud', () => {
                it('should create version', async () => {
                    const algorithm = { name: 'get-alg', version, data: { prop: 'bla' } };
                    await etcd.algorithms.versions.create(algorithm);
                    const etcdGet = await etcd.algorithms.versions.get({ version, name: algorithm.name });
                    expect(etcdGet).to.eql(algorithm);
                });
                it('should update specific version', async () => {
                    const algorithm = { name: 'get-alg', version, data: { name: 'bla' } };
                    await etcd.algorithms.versions.create(algorithm);
                    await etcd.algorithms.versions.update({ version, name: algorithm.name, pinned: true, tags: ['fast'] });
                    const etcdGet = await etcd.algorithms.versions.get({ version, name: algorithm.name });
                    expect(etcdGet.pinned).to.eql(true);
                    expect(etcdGet.tags).to.eql(['fast']);
                });
                it('should delete specific version', async () => {
                    const algorithm = { name: 'delete-alg', version, data: { name: 'bla' } };
                    await etcd.algorithms.versions.create(algorithm);
                    await etcd.algorithms.versions.delete({ version, name: algorithm.name });
                    const etcdGet = await etcd.algorithms.versions.get({ version, name: algorithm.name });
                    expect(etcdGet).to.be.null;
                });
                it('should get version list', async () => {
                    const name = 'list';
                    const uid = uuidv4();
                    await etcd.algorithms.versions.create({ name: `${name}-${uid}`, version: '1.0.1', data: { name: 'bla' } });
                    await etcd.algorithms.versions.create({ name: `${name}-${uid}`, version: '1.0.2', data: { name: 'bla' } });
                    await etcd.algorithms.versions.create({ name: `${name}-${uid}`, version: '1.0.3', data: { name: 'bla' } });
                    const list = await etcd.algorithms.versions.list({ name: `${name}-${uid}` });
                    expect(list).to.have.lengthOf(3);
                });
            });
            describe('watch', () => {
                it('should watch change version', async () => {
                    const options = { name: 'green-alg', version, data: { name: 'bla' } };
                    await etcd.algorithms.versions.watch(options);
                    etcd.algorithms.versions.on('change', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.versions.create(options);
                    await _semaphore.done();
                });
                it('should single watch version', async () => {
                    const options = { name: 'single-watch-alg', version, data: { name: 'bla' } };
                    const callback = sinon.spy();

                    const etcd1 = new Etcd(config);
                    const etcd2 = new Etcd(config);

                    await etcd1.algorithms.versions.singleWatch(options);
                    etcd1.algorithms.versions.on('change', callback);

                    await etcd2.algorithms.versions.singleWatch(options);
                    etcd2.algorithms.versions.on('change', callback);

                    await etcd.algorithms.versions.create(options);
                    await delay(200);
                    expect(callback.callCount).to.be.equal(1);
                });
                it('should watch delete version', async () => {
                    const options = { name: 'delete-green-alg', version, data: { name: 'bla' } };
                    await etcd.algorithms.versions.watch(options);
                    etcd.algorithms.versions.on('delete', (res) => {
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.versions.create(options);
                    await etcd.algorithms.versions.delete({ ...options, version });
                    await _semaphore.done();
                });
                it('should get data when call to watch', async () => {
                    const algorithm = { name: 'blue-alg', version, data: { name: 'bla' } };
                    await etcd.algorithms.versions.create(algorithm);
                    const etcdGet = await etcd.algorithms.versions.watch({ version, name: algorithm.name });
                    expect(etcdGet).to.eql(algorithm);
                });
                it('should watch all version', async () => {
                    const options = { name: 'yellow-alg', version, data: { name: 'bla' } };
                    await etcd.algorithms.versions.watch();
                    etcd.algorithms.versions.on('change', (res) => {
                        etcd.algorithms.versions.unwatch();
                        expect(res.name).to.eql(options.name);
                        _semaphore.callDone();
                    });
                    await etcd.algorithms.versions.create(options);
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch specific version', async () => {
                    let isCalled = false;
                    const options = { name: 'black-alg', version, data: { name: 'bla' } };
                    await etcd.algorithms.versions.watch(options);
                    etcd.algorithms.versions.on('change', (res) => {
                        isCalled = true;
                    });
                    await etcd.algorithms.versions.unwatch(options);
                    await etcd.algorithms.versions.create(options);
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
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
            it('should get prefix data from discovery with serviceName - multiple results', async () => {
                const serviceName = `test-service-${uuidv4()}`;
                const instanceId1 = `register-test-${uuidv4()}`;
                const instanceId2 = `register-test-${uuidv4()}`;
                const etcd1 = new Etcd({ ...config, serviceName });
                const etcd2 = new Etcd({ ...config, serviceName });
                const expected1 = { foo: 'bar' };
                const expected2 = { foo: 'baz' };
                await etcd1.discovery.register({ instanceId: instanceId1, data: expected1 });
                await etcd2.discovery.register({ instanceId: instanceId2, data: expected2 });
                const actual = await etcd1.discovery.list({ serviceName, sort: 'asc' });
                expect(actual[0]).to.deep.equal(expected1);
                expect(actual[1]).to.deep.equal(expected2);
            });
            it('should get data from discovery without serviceName', async () => {
                const serviceName = 'test-service';
                const instanceId = `register-test-${uuidv4()}`;
                await etcd.discovery.register({ serviceName, instanceId });
                const expected = { foo: 'bar' };
                await etcd.discovery.updateRegisteredData(expected);
                const actual = await etcd.discovery.get({ serviceName, instanceId });
                expect(actual).to.eql(expected);
            });
            it('should get data from discovery with wrong serviceName', async () => {
                const instanceId = `register-test-${uuidv4()}`;
                await etcd.discovery.register({ serviceName: 'test-service-5', instanceId, });
                const expected = { foo: 'bar' };
                await etcd.discovery.updateRegisteredData(expected);
                const actual = await etcd.discovery.get({ serviceName: 'test-service-wrong', instanceId });
                expect(actual).to.be.null;
            });
            it('should delete specific discovery', async () => {
                const serviceName = `test-service-${uuidv4()}`;
                const instanceId = `register-test-${uuidv4()}`;
                const data = { prop: 'bla' };
                const etcd = new Etcd({ ...config, serviceName });
                await etcd.discovery.register({ instanceId, data });
                const before = await etcd.discovery.get({ instanceId });
                expect(before).to.eql(data);
                await etcd.discovery.delete({ instanceId, serviceName });
                const after = await etcd.discovery.get({ instanceId });
                expect(after).to.be.null;
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
    describe('Executions', () => {
        describe('Stored', () => {
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
                    expect(result.data).to.have.deep.keys(data);
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
            describe('locks', () => {
                it('should lock and release success', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const data = {
                        name: 'execution'
                    };
                    const lock1 = await etcd.executions.stored.acquireLock({ jobId, data });
                    const lock2 = await etcd.executions.stored.acquireLock({ jobId, data });
                    await etcd.executions.stored.releaseLock({ jobId, data });
                    const lock4 = await etcd.executions.stored.acquireLock({ jobId, data });
                    expect(lock1.success).to.eql(true);
                    expect(lock2.success).to.eql(false);
                    expect(lock4.success).to.eql(true);
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
        describe('Running', () => {
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
                    await etcd.executions.running.set({ jobId, data });
                    const result = await etcd.executions.running.get({ jobId });
                    expect(result.data).to.have.deep.keys(data);
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
                    await etcd.executions.running.set({ jobId, data });
                    await etcd.executions.running.delete({ jobId });
                    const result = await etcd.executions.running.get({ jobId });
                    expect(result).to.be.null;
                });
            });
            describe('watch', () => {
                it('should watch execution', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const data = { jobId, bla: 'bla' };
                    await etcd.executions.running.watch({ jobId });
                    etcd.executions.running.on('change', (res) => {
                        expect(res.jobId).to.deep.equal(jobId);
                        expect(res.data).to.deep.equal(data);
                        _semaphore.callDone();
                    });
                    await etcd.executions.running.set({ data, jobId });
                    await _semaphore.done();
                });
            });
            describe('unwatch', () => {
                it('should unwatch execution', async () => {
                    let isCalled = false;
                    const state = 'started';
                    const jobId = `jobid-${uuidv4()}`;
                    await etcd.executions.running.watch({ jobId });
                    etcd.jobs.results.on('change', () => {
                        isCalled = true;
                    });
                    await etcd.executions.running.unwatch({ jobId });
                    await etcd.executions.running.set({ data: state, jobId });
                    await delay(100);
                    expect(isCalled).to.equal(false);
                });
            });
        });
    });
    describe('Boards', () => {
        describe('crud', () => {
            it('should throw validation error', () => {
                return new Promise((resolve, reject) => {
                    const options = {};
                    etcd.tensorboard.set(options).catch(e => {
                        expect(e.message).to.equal(`data should have required property 'logDir'`);
                        resolve();
                    });
                });
            });
            it('should get/set specific board', async () => {
                const options = { id: 'bsdr', pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' };
                await etcd.tensorboard.set(options);
                const etcdGet = await etcd.tensorboard.get(options);
                expect(etcdGet).to.deep.equal(options);
            });
            it('should failed to update specific board', async () => {
                const id = `board-${uuidv4()}`;
                const options = { id, pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' };
                const res = await etcd.tensorboard.update(options);
                const etcdGet = await etcd.tensorboard.get(options);
                expect(etcdGet).to.be.null;
                expect(res).to.be.false;
            });
            it('should success to update specific board', async () => {
                const id = `board-${uuidv4()}`;
                const prop = 'bla';
                const options = { id, pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' };
                await etcd.tensorboard.set(options);
                const res = await etcd.tensorboard.update({ id, pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' });
                const etcdGet = await etcd.tensorboard.get(options);
                expect(res).to.be.true;
                expect(etcdGet).to.deep.equal({ ...options });
            });
            it('should delete specific board', async () => {
                const options = { id: 'delete-board', pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' };
                await etcd.tensorboard.set(options);
                const deleteRes = await etcd.tensorboard.delete(options);
                const getRes = await etcd.tensorboard.get(options);
                expect(getRes).to.be.null;
            });
            it('should get builds list', async () => {
                const name = 'list';
                await etcd.tensorboard.set({ id: `${name}-board1`, pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' });
                await etcd.tensorboard.set({ id: `${name}-board2`, pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' });
                await etcd.tensorboard.set({ id: `board3`, pipelineName: 'pname', nodeName: 'nName', logDir: 'dddd' });
                const list = await etcd.tensorboard.list({ id: name });
                const every = list.every(l => l.id.startsWith(name));
                expect(every).to.equal(true);
                expect(list).to.have.lengthOf(2);
            });
        });
    });
    describe('Jobs', () => {
        describe('JobResults', () => {
            describe('crud', () => {
                it('should set and get results', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const data = { bla: 'bla' };
                    await etcd.jobs.results.set({ jobId, data });
                    const result = await etcd.jobs.results.get({ jobId });
                    expect(result).to.have.property('data');
                    expect(result).to.have.property('jobId');
                    expect(result).to.have.property('timestamp');
                    expect(result).to.have.property('timeTook');
                    expect(result.data).to.deep.equal(data);
                });
                it('should update specific results', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const status = 'bla';
                    const error = 'error';
                    await etcd.jobs.results.set({ jobId, data: { status } });
                    await etcd.jobs.results.update({ jobId, data: { error } });
                    const etcdGet = await etcd.jobs.results.get({ jobId });
                    expect(etcdGet.data).to.contains({ status, error });
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
                    const data = { data: { bla: 'bla' } };
                    await etcd.jobs.results.watch({ jobId });
                    etcd.jobs.results.on('change', (res) => {
                        expect(res.data.data).to.deep.equal(data.data);
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
                    await delay(200);
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
                    await etcd.jobs.status.set({ jobId, data });
                    const result = await etcd.jobs.status.get({ jobId });
                    expect(result).to.have.property('data');
                    expect(result).to.have.property('jobId');
                    expect(result).to.have.property('timestamp');
                });
                it('should update specific status', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const status = 'bla';
                    const error = 'error';
                    await etcd.jobs.status.set({ jobId, data: { status } });
                    await etcd.jobs.status.update({ jobId, data: { error } });
                    const etcdGet = await etcd.jobs.status.get({ jobId });
                    expect(etcdGet.data).to.contains({ status, error });
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
            });
            describe('watch', () => {
                it('should watch job status', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const data1 = { data: { status: 'pending' } };
                    const data2 = { data: { status: 'completed' } };
                    await etcd.jobs.status.set({ data: data1, jobId });
                    const currentData = await etcd.jobs.status.watch({ jobId });
                    expect(currentData.data).to.deep.equal(data1);
                    etcd.jobs.status.on('change', (res) => {
                        expect(res.jobId).to.deep.equal(jobId);
                        expect(res.data.data).to.deep.equal(data2.data);
                        _semaphore.callDone();
                    });
                    await etcd.jobs.status.set({ data: data2, jobId });
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

                    await delay(200);

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
        describe('Tasks', () => {
            describe('crud', () => {
                it('should set data', async () => {
                    const jobId = `jobid-${uuidv4()}`;
                    const taskId = `taskid-${uuidv4()}`;
                    const data = { result: { bla: 'bla' }, status: 'complete' };
                    await etcd.jobs.tasks.set({ jobId, taskId, data });
                    const result = await etcd.jobs.tasks.get({ jobId, taskId });
                    expect(result).to.have.property('jobId');
                    expect(result).to.have.property('taskId');
                    expect(result).to.have.property('data');
                    expect(result.data).to.deep.equal(data);
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
                    expect(watch.data).to.deep.equal(data);
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
    });
    describe('PipelineDrives', () => {
        describe('TemplatesStore', () => {
            describe('crud', () => {
                it('should get/set specific store', async () => {
                    const options = { name: 'green-alg', data: 'bla' };
                    await etcd.pipelineDrivers.store.set(options);
                    const etcdGet = await etcd.pipelineDrivers.store.get(options);
                    expect(etcdGet).to.deep.equal(options);
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
                    await delay(200);
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
                    expect(etcdGet).to.eql(options);
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
                    expect(etcdGet).to.deep.equal(options);
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
                    expect(etcdGet).to.eql(options);
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
                    expect(etcdGet).to.eql(options);
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
    describe('Pipelines', () => {
        describe('crud', () => {
            it('should set pipeline', async () => {
                const name = 'pipeline-test';
                const options = { name, data: { bla: 'bla' } };
                await etcd.pipelines.set(options);
                const etcdGet = await etcd.pipelines.get({ name });
                expect(etcdGet).to.deep.equal(options);
            });
            it('should update specific pipeline', async () => {
                const name = `status-${uuidv4()}`;
                const prop = 'bla';
                const options = { name, data: { prop } };
                await etcd.pipelines.set(options);
                await etcd.pipelines.update({ name, data: { newProp: prop } });
                const etcdGet = await etcd.pipelines.get(options);
                expect(etcdGet.data).to.deep.equal({ prop, newProp: prop });
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
    describe('Webhooks', () => {
        describe('crud', () => {
            it('should set and get webhook', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                await etcd.webhooks.set({ jobId, type, pipelineStatus });
                const result = await etcd.webhooks.get({ jobId, type });
                expect(result).to.have.property('jobId');
                expect(result).to.have.property('pipelineStatus');
                expect(result).to.have.property('timestamp');
                expect(result).to.have.property('type');
            });
            it('should delete specific webhook', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                await etcd.webhooks.set({ jobId, type, data: { pipelineStatus } });
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
                const data = { pipelineStatus };
                await etcd.webhooks.set({ jobId: `${jobId}-1`, type: 'results', data });
                await etcd.webhooks.set({ jobId: `${jobId}-2`, type: 'progress', data });
                await etcd.webhooks.set({ jobId: `${jobId}-3`, type: 'error', data });
                await etcd.webhooks.set({ jobId: `${jobId}-4`, type: 'step', data });
                await etcd.webhooks.set({ jobId: `${jobId}-5`, type: 'bla', data });
                const list = await etcd.webhooks.listPrefix({ jobId: 'jobs-list', order, sort, limit });
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
                await etcd.webhooks.watch({ jobId });
                etcd.webhooks.on('change', (result) => {
                    expect(result).to.have.property('jobId');
                    expect(result).to.have.property('timestamp');
                    expect(result).to.have.property('pipelineStatus');
                    _semaphore.callDone();
                });
                await etcd.webhooks.set({ jobId, type, pipelineStatus });
                await _semaphore.done();
            });
            it('should watch webhook progress', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'progress';
                await etcd.webhooks.watch({ jobId });
                etcd.webhooks.on('change', (result) => {
                    expect(result).to.have.property('jobId');
                    expect(result).to.have.property('timestamp');
                    expect(result).to.have.property('pipelineStatus');
                    _semaphore.callDone();
                });
                await etcd.webhooks.set({ jobId, type, pipelineStatus });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch webhook results', async () => {
                let isCalled = false;
                const jobId = `jobid-${uuidv4()}`;
                const pipelineStatus = 'pending';
                const type = 'results';
                const webhook = { pipelineStatus };
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
                const options = { workerId, state: 'ready' };
                await etcd.workers.set(options);
                const result = await etcd.workers.get({ workerId });
                expect(result).to.eql(options);
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
                const options = { workerId, code: 'blah' };
                await etcd.workers.set(options);
                const result = await etcd.workers.get({ workerId });
                expect(result).to.eql(options);
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
                const options = { workerId, state: 'ready' };
                await etcd.workers.set(options);
                const result = await etcd.workers.watch({ workerId });
                expect(result).to.eql(options);
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
    describe('Triggers', () => {
        describe('crud', () => {
            it('should set status', async () => {
                const jobId1 = `jobId-tree-root`;
                const jobId2 = `jobId-tree-level-1.a`;
                const jobId3 = `jobId-tree-level-1.b`;
                const jobId4 = `jobId-tree-level-2.a`;
                const jobId5 = `jobId-tree-level-2.b`;
                const jobId6 = `jobId-tree-level-3.a`;

                await etcd.triggers.tree.set({ rootJobName: 'root', jobId: jobId1, rootJobId: jobId1 });
                await etcd.triggers.tree.set({ name: 'level-1.a', jobId: jobId2, rootJobId: jobId1, parentJobId: jobId1 });
                await etcd.triggers.tree.set({ name: 'level-1.b', jobId: jobId3, rootJobId: jobId1, parentJobId: jobId1 });
                await etcd.triggers.tree.set({ name: 'level-2.a', jobId: jobId4, rootJobId: jobId1, parentJobId: jobId2 });
                await etcd.triggers.tree.set({ name: 'level-2.b', jobId: jobId5, rootJobId: jobId1, parentJobId: jobId3 });
                await etcd.triggers.tree.set({ name: 'level-3.a', jobId: jobId6, rootJobId: jobId1, parentJobId: jobId4 });

                const tree = await etcd.triggers.tree.get({ jobId: jobId1 });
                expect(tree).to.eql(triggersTreeExpected);
            });
        });
    });
    describe('Events', () => {
        describe('crud', () => {
            it('should set and get event', async () => {
                const data = {
                    reason: 'reason',
                    message: 'message'
                };
                const eventId = await etcd.events.set(data);
                const result = await etcd.events.get({ eventId });
                expect(result).to.have.property('eventId');
                expect(result).to.have.property('timestamp');
                expect(result).to.have.property('source');
                expect(result).to.have.property('type');
                expect(result).to.have.property('reason');
                expect(result).to.have.property('message');
                expect(result.reason).to.equal(data.reason);
                expect(result.message).to.equal(data.message);
            });
            it('should delete specific event', async () => {
                const data = {
                    reason: 'string',
                    message: 'execution'
                };
                const eventId = await etcd.events.set(data);
                await etcd.events.delete({ eventId });
                const result = await etcd.events.get({ eventId });
                expect(result).to.be.null;
            });
            it('should delete all events', async () => {
                const data = {
                    reason: 'string',
                    message: 'execution'
                };
                await etcd.events.set(data);
                await etcd.events.set(data);
                await etcd.events.set(data);
                const all = await etcd.events.list();
                await Promise.all(all.map(e => etcd.events.delete({ eventId: e.eventId })));
                const none = await etcd.events.list();
                expect(none).to.have.lengthOf(0);
            });
        });
        describe('watch', () => {
            it('should watch events', async () => {
                let eventId;
                await etcd.events.watch();
                etcd.events.on('change', async (res) => {
                    await delay(1000);
                    expect(res.eventId).to.equal(eventId);
                    _semaphore.callDone();
                });
                eventId = await etcd.events.set({ reason: 'reason', message: 'message' });
                await _semaphore.done();
            });
        });
    });
});
