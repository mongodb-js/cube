const EVENT_REGEX = /_events$/;

// Much like db.collection, but caches the result for both events and metrics.
// Also, this is synchronous, since we are opening a collection unsafely.
var types = module.exports = function(db) {
  var collections = {};
  
  return function(type) {
    var collection = collections[type];
    if (!collection) {
      collection = collections[type] = {};
      db.collection(type + '_events', function(error, events) {
        collection.events = events;
      });
      db.collection(type + '_metrics', function(error, metrics) {
        collection.metrics = metrics;
      });
    }
    return collection;
  };
};

types.getter = function(db) {
  return function(request, callback) {
    db.collectionNames(function(error, names) {
      if (error) return callback(error);

      var res = names.map(function(d) {
        return d.name.split('.')[1];
      })
      .filter(function(d) {
        return EVENT_REGEX.test(d);
      })
      .map(function(d) {
        return d.substring(0, d.length - 7);
      })
      .sort();
      callback(res);
    });
  };
};
