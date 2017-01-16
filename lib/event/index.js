// TODO include the event._id (and define a JSON encoding for ObjectId?)
// TODO allow the event time to change when updating (fix invalidation)
var parser = require('./event-expression');
var types = require('../common/types');

// When streaming events, we should allow a delay for events to arrive, or else
// we risk skipping events that arrive after their event.time. This delay can be
// customized by specifying a `delay` property as part of the request.
const DEFAULT_DELAY = 5000;

var inherits = require('util').inherits;
var Readable = require('streams').Readable;

var POOL = {};

function Reader(db, expression, opts) {
  this.getCollectionsForType = types(db);

  Readable.call(this, {objectMode: true});

  this.start = new Date(opts.start || Date.now());
  // Validate the dates.
  if (isNaN(this.start)) {
    return new TypeError('invalid start');
  }

  var delay = DEFAULT_DELAY;
  this.stop = new Date(Date.now() - delay);
  if (isNaN(this.stop)) {
    return new TypeError('invalid stop');
  }

  // Parse the expression.
  this.expression = parser.parse(expression);

  // Set an optional limit on the number of events to return.
  this.options = {
    sort: {
      t: -1
    },
    batchSize: 1000
  };

  if (opts.limiit) {
    this.options.limit = +opts.limit;
  }

  // Copy any expression filters into the query object.
  this.spec = {
    t: {
      $gte: this.start,
      $lt: this.stop
    }
  };
  this.expression.filter(this.spec);

  // Request any needed fields.
  this.fields = {
    t: 1
  };

  this.expression.fields(this.fields);

  // Unique ID for this reader;
  this._id = this.expression.source;
}
inherits(Reader, Readable);

Reader.prototype._read = function() {
  // TODO (imlucas) Backfill new readers as they join.
};

/**
 * Open a new tailing cursor.
 */
Reader.prototype.query = function() {
  var coll = this.getCollectionsForType(this.expression.type).events;
  coll.find(this.spec, this.fields, this.options).stream()
  .on('data', (event) => {
    this.push({
      id: event._id,
      time: event.t,
      data: event.d
    });
  })
  .on('close', () => {
    this.push(null);
  });
};
//
//
// exports.getter = function(db) {
//   var streamsBySource = {};
//   function getter(request, callback) {
//     // For streaming queries, share streams for efficient polling.
//     if (stream) {
//       var streams = streamsBySource[expression.source];
//
//       // If there is an existing stream to attach to, backfill the initial set
//       // of results to catch the client up to the stream. Add the new callback
//       // to a queue, so that when the shared stream finishes its current poll,
//       // it begins notifying the new client. Note that we don't pass the null
//       // (end terminator) to the callback, because more results are to come!
//       if (streams) {
//         spec.t.$lt = streams.time;
//         streams.waiting.push(callback);
//         query(function(event) {
//           if (event) {
//             callback(event);
//           }
//         });
//       }
//
//       // Otherwise, we're creating a new stream, so we're responsible for
//       // starting the polling loop. This means notifying active callbacks,
//       // detecting when active callbacks are closed, advancing the time window,
//       // and moving waiting clients to active clients.
//       else {
//         streams = streamsBySource[expression.source] = {
//           time: stop,
//           waiting: [],
//           active: [callback]
//         };
//         (function poll() {
//           query(function(event) {
//             // If there's an event, send it to all active, open clients.
//             if (event) {
//               streams.active.forEach(function(callback) {
//                 if (!callback.closed) {
//                   callback(event);
//                 }
//               });
//             }
//
//             // Otherwise, we've reached the end of a poll, and it's time to
//             // merge the waiting callbacks into the active callbacks. Advance
//             // the time range, and set a timeout for the next poll.
//             else {
//               streams.active = streams.active.concat(streams.waiting).filter(open);
//               streams.waiting = [];
//
//               // If no clients remain, then it's safe to delete the shared
//               // stream, and we'll no longer be responsible for polling.
//               if (!streams.active.length) {
//                 delete streamsBySource[expression.source];
//                 return;
//               }
//
//               filter.t.$gte = streams.time;
//               filter.t.$lt = streams.time = new Date(Date.now() - delay);
//               setTimeout(poll, INTERVAL);
//             }
//           });
//         })();
//       }
//     }
//   }
//   return getter;
// };


/**
 *
 #
 * @example
 * var expr = parser.parse(req.param('expression'));
 * var opts = Object.assign({}, req.params, req.query);
 * var events = exports.getReadableStream(db, expr, opts);
 * events.pipe(res);
 */
exports.getReadableStream = function(db, expr, opts) {
  var stream = POOL[expr.source];
  if (!stream) {
    stream = new Reader(db, expr, opts);
  }
  return stream;
};
