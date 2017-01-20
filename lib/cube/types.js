// Much like db.collection, but caches the result for both events and metrics.
// Also, this is synchronous, since we are opening a collection unsafely.

var debug = require('debug')('cube:types');

var EVENTS_RE = /_events$/;

var collections = {};

function getCollectionForType(db, type) {
  debug('get collection for type', type);

  var collection = collections[type];
  if (!collection) {
    debug('not in cache.  allocating.');
    collection = collections[type] = {
      events: db.collection(`${type}_events`),
      metrics: db.collection(`${type}_metrics`)
    };
  } else {
    debug('%s already in cache', type);
  }
  return collection;
}

function getTypes(db, req, done) {
  db.listCollections().toArray(function(err, colls) {
    if (err) return done(err);

    var names = colls.map(function(c) {
      return c.name;
    });

    var res = names.map(function(d) {
      return d.split('.')[1];
    })
    .filter(function(d) {
      return EVENTS_RE.test(d);
    })
    .map(function(d) {
      return d.substring(0, d.length - 7);
    })
    .sort();

    debug('resolved types', res);
    done(res);
  });
};

module.exports = function(db) {
  return getCollectionForType.bind(null, db);
};

module.exports.getter = function(db) {
  return getTypes.bind(null, db);
};
