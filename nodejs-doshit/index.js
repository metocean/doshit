// Generated by CoffeeScript 1.9.2
var Doshit, EventEmitter, moment, redis, startswith, util, uuid;

redis = require('redis');

uuid = require('uuid');

moment = require('moment');

EventEmitter = require('events').EventEmitter;

util = require('util');

startswith = function(s, prefix, position) {
  if (position == null) {
    position = 0;
  }
  return s.indexOf(prefix, position) === position;
};

Doshit = function(url, appprefix, queueprefix) {
  var doshit, pendinglist, queries, resultschannel, subscriptions, taskcallbacks, taskprefix;
  EventEmitter.call(this);
  doshit = this;
  resultschannel = appprefix + ":results";
  pendinglist = appprefix + ":" + queueprefix + ":pending";
  taskprefix = appprefix + ":task:";
  taskcallbacks = {};
  queries = redis.createClient({
    url: url
  });
  queries.on('error', function(err) {
    return doshit.emit('error', err);
  });
  subscriptions = redis.createClient({
    url: url
  });
  subscriptions.on('error', function(err) {
    return doshit.emit('error', err);
  });
  subscriptions.on('message', function(channel, message) {
    var taskid;
    if (channel !== resultschannel) {
      return;
    }
    if (!startswith(message, '')) {
      return;
    }
    taskid = message.substr(taskprefix.length);
    if (taskcallbacks[taskid] == null) {
      return;
    }
    return doshit.gettask(taskid, function(err, task) {
      var cb, i, j, len, len1, ref, ref1, ref2, results, results1;
      if (err != null) {
        doshit.emit('error', err);
        return;
      }
      if (task.state !== 'finished') {
        return;
      }
      if (task.result === 'successful') {
        ref = taskcallbacks[taskid];
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          cb = ref[i];
          cb(null, task['result-value'], task);
          results.push(doshit.emit('success', task['result-value'], task));
        }
        return results;
      } else if (task.result === 'failed') {
        ref1 = taskcallbacks[taskid];
        results1 = [];
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          cb = ref1[j];
          cb((ref2 = task['error-exception']) != null ? ref2 : task, null, task);
          results1.push(doshit.emit('failure', task['error-exception'], task));
        }
        return results1;
      }
    });
  });
  subscriptions.subscribe(resultschannel);
  this.task = (function(_this) {
    return function(name, args, cb) {
      var taskid;
      taskid = uuid.v4();
      return _this.taskwithid(taskid, name, args, cb);
    };
  })(this);
  this.taskwithid = (function(_this) {
    return function(taskid, name, args, cb) {
      var task;
      if (taskcallbacks[taskid] == null) {
        taskcallbacks[taskid] = [];
      }
      taskcallbacks[taskid].push(cb);
      task = {
        "function": name,
        state: 'pending',
        args: JSON.stringify(args, null, 2)
      };
      queries.hmset("" + taskprefix + taskid, task, function(err) {
        if (err != null) {
          cb(err);
          doshit.emit('error', err);
          return;
        }
        return queries.lpush(pendinglist, taskid, function(err) {
          if (err != null) {
            cb(err);
            doshit.emit('error', err);
          }
        });
      });
      return taskid;
    };
  })(this);
  this.gettask = function(taskid, cb) {
    return queries.hgetall("" + taskprefix + taskid, function(err, task) {
      var f, i, j, len, len1, ref, ref1;
      if (err != null) {
        return cb(err);
      }
      if (task == null) {
        return cb(err, task);
      }
      ref = ['args', 'result-value'];
      for (i = 0, len = ref.length; i < len; i++) {
        f = ref[i];
        if (task[f] == null) {
          continue;
        }
        task[f] = JSON.parse(task[f]);
      }
      ref1 = ['executing-created', 'finished-created'];
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        f = ref1[j];
        if (task[f] == null) {
          continue;
        }
        task[f] = moment.utc(task[f], 'YYYY-MM-DD[T]HH:mm:ss.SSSSSS[Z]').toDate();
      }
      return cb(null, task);
    });
  };
  this.quit = function() {
    queries.quit();
    return subscriptions.quit();
  };
  this.end = function() {
    queries.end();
    return subscriptions.end();
  };
  return this;
};

util.inherits(Doshit, EventEmitter);

module.exports = function(url, appprefix, queueprefix) {
  return new Doshit(url, appprefix, queueprefix);
};
