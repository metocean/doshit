# doshit in python

## example of running doshit

Note you must start the redis-server.

## requirements dependencies

``` bash
pip install psutil redis
```

### start worker
``` bash
cd python-doshit/examples/
python ../doshit/worker.py tasks
```
or if you if you have install via 'python setup.py install'
``` bash
cd python-doshit/examples/
doshit worker tasks
```

The worker waits for a job from redis then excutes the job then stores and broadcast the result in redis.

### calling task and function in python
``` python
from tasks import add
add_result = add.exec_async(1, 2)
print add_result.wait()
```

## installing doshit

``` bash
cd python-doshit/
python setup.py install
```
or via vituralenvwapper

``` bash
cd python-doshit/
mkvirtualenv doshit --system-site-package
add2virtualenv .
```
