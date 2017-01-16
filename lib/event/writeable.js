const tiers = require('../common/tiers');
const types = require('../common/types');
const bisect = require('../common/bisect');

const TYPE_RE = /^[a-z][a-zA-Z0-9_]+$/;

var invalidate = {
  $set: {
    i: true
  }
};

/**
 * How frequently to invalidate metrics after receiving events.
 */
var invalidateInterval = 5000;


exports.putter = function(db) {
  var collection = types(db);
  var knownByType = {};
  var eventsToSaveByType = {};
  var timesToInvalidateByTierByType = {};

  function putter(request, callback) {
    var time = 'time' in request ? new Date(request.time) : new Date();
    var type = request.type;

    // Validate the date and type.
    if (!TYPE_RE.test(type)) {
      return callback(new TypeError('invalid type'));
    }

    if (isNaN(time)) {
      return callback(new TypeError('invalid time'));
    }

    // If an id is specified, promote it to Mongo's primary key.
    var event = {
      t: time,
      d: request.data
    };
    if ('id' in request) {
      event._id = request.id;
    }

    // If this is a known event type, save immediately.
    if (type in knownByType) {
      return save(type, event);
    }

    // If someone is already creating the event collection for this new type,
    // then append this event to the queue for later save.
    if (type in eventsToSaveByType) {
      return eventsToSaveByType[type].push(event);
    }

    // Otherwise, it's up to us to see if the collection exists, verify the
    // associated indexes, create the corresponding metrics collection, and save
    // any events that have queued up in the interim!

    // First add the new event to the queue.
    eventsToSaveByType[type] = [event];

    // If the events collection exists, then we assume the metrics & indexes do
    // too. Otherwise, we must create the required collections and indexes. Note
    // that if you want to customize the size of the capped metrics collection,
    // or add custom indexes, you can still do all that by hand.
    db.collectionNames(type + '_events', function(error, names) {
      var events = collection(type).events;
      if (names.length) {
        return saveEvents();
      }

      // Events are indexed by time.
      events.ensureIndex({
        t: 1
      }, handle);

      // Create a capped collection for metrics. Three indexes are required: one
      // for finding metrics, one (_id) for updating, and one for invalidation.
      db.createCollection(type + '_metrics', metric_options, function(error, metrics) {
        handle(error);
        metrics.ensureIndex({
          i: 1,
          '_id.e': 1,
          '_id.l': 1,
          '_id.t': 1
        }, handle);
        metrics.ensureIndex({
          i: 1,
          '_id.l': 1,
          '_id.t': 1
        }, handle);
        saveEvents();
      });

      // Save any pending events to the new collection.
      function saveEvents() {
        knownByType[type] = true;
        eventsToSaveByType[type].forEach(function(event) {
          save(type, event);
        });
        delete eventsToSaveByType[type];
      }
    });
  }

  // Save the event of the specified type, and queue invalidation of any cached
  // metrics associated with this event type and time.
  //
  // We don't invalidate the events immediately. This would cause many redundant
  // updates when many events are received simultaneously. Also, having a short
  // delay between saving the event and invalidating the metrics reduces the
  // likelihood of a race condition between when the events are read by the
  // evaluator and when the newly-computed metrics are saved.
  function save(type, event) {
    collection(type).events.save(event, handle);
    queueInvalidation(type, event);
  }

  // Schedule deferred invalidation of metrics for this type.
  // For each type and tier, track the metric times to invalidate.
  // The times are kept in sorted order for bisection.
  function queueInvalidation(type, event) {
    var timesToInvalidateByTier = timesToInvalidateByTierByType[type];
    var time = event.t;
    if (timesToInvalidateByTier) {
      for (var tier in tiers) {
        var tierTimes = timesToInvalidateByTier[tier];
        var tierTime = tiers[tier].floor(time);
        var i = bisect(tierTimes, tierTime);
        if (i >= tierTimes.length) {
          tierTimes.push(tierTime);
        } else if (tierTimes[i] > tierTime) {
          tierTimes.splice(i, 0, tierTime);
        }
      }
    } else {
      timesToInvalidateByTier = timesToInvalidateByTierByType[type] = {};
      for (var tier in tiers) {
        timesToInvalidateByTier[tier] = [tiers[tier].floor(time)];
      }
    }
  }

  // Process any deferred metric invalidations, flushing the queues. Note that
  // the queue (timesToInvalidateByTierByType) is copied-on-write, so while the
  // previous batch of events are being invalidated, new events can arrive.
  setInterval(function() {
    for (var type in timesToInvalidateByTierByType) {
      var metrics = collection(type).metrics;
      var timesToInvalidateByTier = timesToInvalidateByTierByType[type];
      for (var tier in tiers) {
        metrics.update({
          i: false,
          '_id.l': +tier,
          '_id.t': {
            $in: timesToInvalidateByTier[tier]
          }
        }, invalidate, multi, handle);
      }
      flushed = true;
    }
    timesToInvalidateByTierByType = {}; // copy-on-write
  }, invalidateInterval);

  return putter;
};
