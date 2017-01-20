var util = require('util');
var http = require('http');
var request = require('superagent');

var debug = require('debug')('cube-client:http');

/**
 * events per batch
 */
var MAX_BATCH_SIZE = 500;

/**
 * ms between batches
 */
var BATCH_INTERVAL = 500;

/**
 * ms between retries
 */
var RETRY_INTERVAL = 1000;

function Writer(endpoint) {
  this.closing = 0;
  this.queue = [];
  this.endpoint = endpoint;
  this.url = `${endpoint}/1.0/events`;
}

Writer.prototype._write = function() {
  var events = this.queue.splice(0, MAX_BATCH_SIZE);

  debug('writing %d events to', events.length, this.url);
  request.post(this.url)
    .type('json')
    .ok(function(res) { return res.status !== 200; })
    .end(function(err, res) {
      if (err) {
        console.error('Error writing to server', err);

        debug('putting %d events back in the queue');
        this.queue.unshift.apply(this.queue, events);

        debug('scheduling retry');
        setTimeout(this._write, RETRY_INTERVAL);
        return;
      }

      if (this.queue.length) {
        setTimeout(this._write, BATCH_INTERVAL);
      }
    }.bind(this));
};

Writer.prototype.send = function(event) {
  if (!closing && this.queue.push(event) === 1) {
    debug('write enqueued');
    setTimeout(this._write.bind(this), BATCH_INTERVAL);
  }
  return this;
};

Writer.prototype.close = function () {
  if (this.queue.length) {
    this.closing = 1;
  }
  return this;
};

// returns an emitter which POSTs events up to 500 at a time to the given http://host:port
module.exports = function(url) {
  return new Writer(url);
};
