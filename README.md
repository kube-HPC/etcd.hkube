# etcd.hkube

[![Build Status](https://travis-ci.org/kube-HPC/etcd.hkube.svg?branch=master)](https://travis-ci.org/kube-HPC/etcd.hkube)
[![Coverage Status](https://coveralls.io/repos/github/kube-HPC/etcd.hkube/badge.svg?branch=master)](https://coveralls.io/github/kube-HPC/etcd.hkube?branch=master)


```js

algorithms
     builds
     debug
     executions
     queue
     requirements
     store

discovery

executions
     stored
     running
        
jobs
     tasks
     active
     status
     results
        
pipelineDrivers 
     queue
     requirements
     store
        
pipelines
webhooks
workers

```

For each sub item in the hierarchy the following methods are available:

- get
- set
- update
- delete
- list
- watch
- unwatch


The API works exactly as the hierarchy above:

- algorithms.builds.get
- jobs.status.set
- jobs.results.watch


