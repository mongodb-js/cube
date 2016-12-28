var assert = require('assert');
var tiers = require('../lib/cube/tiers');

function utc(year, month, day, hours, minutes, seconds) {
  return new Date(Date.UTC(year, month, day, hours || 0, minutes || 0, seconds || 0));
}

describe('tiers', function() {
  it('should contain exactly the expected tiers', function() {
    var keys = Object.keys(tiers);
    keys.sort(function(a, b) {
      return a - b;
    });
    assert.deepEqual(keys, [1e4, 6e4, 3e5, 36e5, 864e5]);
  });

  describe('second10', function() {
    var tier = tiers[1e4];

    it('should have the key 1e4', function() {
      assert.strictEqual(tier.key, 1e4);
    });
    it('should have next as undefined', function() {
      assert.isUndefined(tier.next);
    });
    it('should have size as undefined', function() {
      assert.isUndefined(tier.size);
    });

    describe('floor', function() {
      it('should round down to 10-seconds', function() {
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 0, 20)), utc(2011, 8, 2, 12, 0, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 0, 21)), utc(2011, 8, 2, 12, 0, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 0, 23)), utc(2011, 8, 2, 12, 0, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 0, 39)), utc(2011, 8, 2, 12, 0, 30));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 0, 40)), utc(2011, 8, 2, 12, 0, 40));
      });
      it('should not modify the passed-in date', function() {
        var date = utc(2011, 8, 2, 12, 0, 21);
        assert.deepEqual(tier.floor(date), utc(2011, 8, 2, 12, 0, 20));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 0, 21));
      });
    });

    describe('ceil', function() {
      it('should rounds up to 10-seconds', function() {
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 0, 20)), utc(2011, 8, 2, 12, 0, 20));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 0, 21)), utc(2011, 8, 2, 12, 0, 30));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 0, 23)), utc(2011, 8, 2, 12, 0, 30));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 0, 39)), utc(2011, 8, 2, 12, 0, 40));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 0, 40)), utc(2011, 8, 2, 12, 0, 40));
      });
      it('should does not modified the specified date', function() {
        var date = utc(2011, 8, 2, 12, 0, 21);
        assert.deepEqual(tier.ceil(date), utc(2011, 8, 2, 12, 0, 30));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 0, 21));
      });
    });

    describe('step', function() {
      it('should increment time by ten seconds', function() {
        var date = utc(2011, 8, 2, 23, 59, 20);
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 59, 30));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 59, 40));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 59, 50));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 0, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 0, 10));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 0, 20));
      });
      it('should not round the specified date', function() {
        assert.deepEqual(tier.step(utc(2011, 8, 2, 12, 21, 23)), utc(2011, 8, 2, 12, 21, 33));
      });
      it('should  not modify the specified date', function() {
        var date = utc(2011, 8, 2, 12, 20, 0);
        assert.deepEqual(tier.step(date), utc(2011, 8, 2, 12, 20, 10));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 20, 0));
      });
    });
  });

  describe('minute', function() {
    var tier = tiers[6e4];

    it('should have the key 6e4', function() {
      assert.strictEqual(tier.key, 6e4);
    });
    it('should have next as undefined', function() {
      assert.isUndefined(tier.next);
    });
    it('should have size as undefined', function() {
      assert.isUndefined(tier.size);
    });

    describe('floor', function() {
      it('rounds down to minutes', function() {
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 20, 0)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 20, 1)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 2, 12, 21));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 23, 0)), utc(2011, 8, 2, 12, 23));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 24, 59)), utc(2011, 8, 2, 12, 24));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 25, 0)), utc(2011, 8, 2, 12, 25));
      });

      it('does not modify the passed-in date', function() {
        var date = utc(2011, 8, 2, 12, 21, 20);
        assert.deepEqual(tier.floor(date), utc(2011, 8, 2, 12, 21));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21, 20));
      });
    });

    describe('ceil', function() {
      it('rounds up to minutes', function() {
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 20, 0)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 20, 1)), utc(2011, 8, 2, 12, 21));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 2, 12, 21));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 23, 0)), utc(2011, 8, 2, 12, 23));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 24, 59)), utc(2011, 8, 2, 12, 25));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 25, 0)), utc(2011, 8, 2, 12, 25));
      });
      it('does not modified the specified date', function() {
        var date = utc(2011, 8, 2, 12, 21, 20);
        assert.deepEqual(tier.ceil(date), utc(2011, 8, 2, 12, 22));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21, 20));
      });
    });

    describe('step', function() {
      it('increments time by one minute', function() {
        var date = utc(2011, 8, 2, 23, 45, 0);
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 46));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 47));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 48));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 49));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 50));
      });
      it('does not round the specified date', function() {
        assert.deepEqual(tier.step(utc(2011, 8, 2, 12, 21, 23)), utc(2011, 8, 2, 12, 22, 23));
      });
      it('does not modify the specified date', function() {
        var date = utc(2011, 8, 2, 12, 20);
        assert.deepEqual(tier.step(date), utc(2011, 8, 2, 12, 21));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 20));
      });
    });
  });

  describe('minute5', function() {
    var tier = tiers[3e5];
    it('has the key 3e5', function() {
      assert.strictEqual(tier.key, 3e5);
    });
    it('next is undefined', function() {
      assert.isUndefined(tier.next);
    });
    it('size is undefined', function() {
      assert.isUndefined(tier.size);
    });

    describe('floor', function() {
      it('rounds down to 5-minutes', function() {
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 20, 0)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 20, 1)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 23, 0)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 24, 59)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 25, 0)), utc(2011, 8, 2, 12, 25));
      });
      it('does not modify the passed-in date', function() {
        var date = utc(2011, 8, 2, 12, 21);
        assert.deepEqual(tier.floor(date), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21));
      });
    });

    describe('ceil', function() {
      it('rounds up to 5-minutes', function() {
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 20, 0)), utc(2011, 8, 2, 12, 20));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 20, 1)), utc(2011, 8, 2, 12, 25));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 2, 12, 25));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 23, 0)), utc(2011, 8, 2, 12, 25));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 24, 59)), utc(2011, 8, 2, 12, 25));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 25, 0)), utc(2011, 8, 2, 12, 25));
      });
      it('does not modified the specified date', function() {
        var date = utc(2011, 8, 2, 12, 21, 0);
        assert.deepEqual(tier.ceil(date), utc(2011, 8, 2, 12, 25));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21));
      });
    });

    describe('step', function() {
      it('increments time by five minutes', function() {
        var date = utc(2011, 8, 2, 23, 45, 0);
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 50));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 55));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 5));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 10));
      });
      it('does not round the specified date', function() {
        assert.deepEqual(tier.step(utc(2011, 8, 2, 12, 21, 23)), utc(2011, 8, 2, 12, 26, 23));
      });
      it('does not modify the specified date', function() {
        var date = utc(2011, 8, 2, 12, 20, 0);
        assert.deepEqual(tier.step(date), utc(2011, 8, 2, 12, 25));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 20));
      });
    });
  });

  describe('hour', function() {
    var tier = tiers[36e5];

    it('has the key 36e5', function() {
      assert.strictEqual(tier.key, 36e5);
    });
    it('next is the 5-minute tier', function() {
      assert.equal(tier.next, tiers[3e5]);
    });
    it('size is 12', function() {
      assert.strictEqual(tier.size(), 12);
    });

    describe('floor', function() {
      it('rounds down to hours', function() {
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 0, 0)), utc(2011, 8, 2, 12, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 0, 1)), utc(2011, 8, 2, 12, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 2, 12, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 59, 59)), utc(2011, 8, 2, 12, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 13, 0, 0)), utc(2011, 8, 2, 13, 0));
      });
      it('does not modify the passed-in date', function() {
        var date = utc(2011, 8, 2, 12, 21);
        assert.deepEqual(tier.floor(date), utc(2011, 8, 2, 12, 0));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21));
      });
    });

    describe('ceil', function() {
      it('rounds up to hours', function() {
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 0, 0)), utc(2011, 8, 2, 12, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 0, 1)), utc(2011, 8, 2, 13, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 2, 13, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 59, 59)), utc(2011, 8, 2, 13, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 13, 0, 0)), utc(2011, 8, 2, 13, 0));
      });
      it('does not modified the specified date', function() {
        var date = utc(2011, 8, 2, 12, 21, 0);
        assert.deepEqual(tier.ceil(date), utc(2011, 8, 2, 13, 0));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21));
      });
    });

    describe('step', function() {
      it('increments time by one hour', function() {
        var date = utc(2011, 8, 2, 22, 0, 0);
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 2, 23, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 1, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 2, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 3, 0));
      });
      it('does not round the specified date', function() {
        assert.deepEqual(tier.step(utc(2011, 8, 2, 12, 21, 23)), utc(2011, 8, 2, 13, 21, 23));
      });
      it('does not modify the specified date', function() {
        var date = utc(2011, 8, 2, 12, 0, 0);
        assert.deepEqual(tier.step(date), utc(2011, 8, 2, 13, 0));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 0));
      });
    });
  });

  describe('day', function() {
    var tier = tiers[864e5];
    it('has the key 864e5', function() {
      assert.strictEqual(tier.key, 864e5);
    });
    it('next is the one-hour tier', function() {
      assert.equal(tier.next, tiers[36e5]);
    });
    it('size is 24', function() {
      assert.strictEqual(tier.size(), 24);
    });

    describe('floor', function() {
      it('rounds down to days', function() {
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 0, 0, 0)), utc(2011, 8, 2, 0, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 0, 0, 1)), utc(2011, 8, 2, 0, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 2, 0, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 2, 23, 59, 59)), utc(2011, 8, 2, 0, 0));
        assert.deepEqual(tier.floor(utc(2011, 8, 3, 0, 0, 0)), utc(2011, 8, 3, 0, 0));
      });
      it('does not modify the passed-in date', function() {
        var date = utc(2011, 8, 2, 12, 21);
        assert.deepEqual(tier.floor(date), utc(2011, 8, 2, 0, 0));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21));
      });
    });

    describe('ceil', function() {
      it('rounds up to days', function() {
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 0, 0, 0)), utc(2011, 8, 2, 0, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 0, 0, 1)), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 12, 21, 0)), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 2, 23, 59, 59)), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(tier.ceil(utc(2011, 8, 3, 0, 0, 0)), utc(2011, 8, 3, 0, 0));
      });
      it('does not modified the specified date', function() {
        var date = utc(2011, 8, 2, 12, 21, 0);
        assert.deepEqual(tier.ceil(date), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(date, utc(2011, 8, 2, 12, 21));
      });
    });

    describe('step', function() {
      it('increments time by one day', function() {
        var date = utc(2011, 8, 2, 0, 0, 0);
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 4, 0, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 5, 0, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 6, 0, 0));
        assert.deepEqual(date = tier.step(date), utc(2011, 8, 7, 0, 0));
      });
      it('does not round the specified date', function() {
        assert.deepEqual(tier.step(utc(2011, 8, 2, 12, 21, 23)), utc(2011, 8, 3, 12, 21, 23));
      });
      it('does not modify the specified date', function() {
        var date = utc(2011, 8, 2, 0, 0, 0);
        assert.deepEqual(tier.step(date), utc(2011, 8, 3, 0, 0));
        assert.deepEqual(date, utc(2011, 8, 2, 0, 0));
      });
    });
  });
});
