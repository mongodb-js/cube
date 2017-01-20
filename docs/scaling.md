# Scaling Cube and Mongo

With some modifications, you can make cube scale to thousands of inserts per second.

These are very rough notes, but perhaps useful to you.

Cube saves two kinds of records:

* Raw individual events. An event stream of 2400 records/s at 1kB each is 200 GB/day, 1.4 TB/week.
* Metrics aggregated over those events. For an event stream of any size, storing a year's worth of aggregates for 100 different metrics is 25 GB. (That's 10-second, 1-minute, 5-minute and hour aggregates, 68 bytes each)

## Scaling Cube

### Database patterns of access

* Collector: insert on events from receiving event
* Collector: update on metrics for invalidation (flush)
* Evaluator: find on metrics for metric calculation
* Evaluator: find on metrics for pyramidal calculation
* Evaluator: cursored find on events for calculateFlat
* Evaluator: save (upsert) on metrics from calculateFlat

### Cube do's and don'ts

* ensure time-based / ascending IDs
* Don't send old metrics
* Turn dates into mongo dates, not text strings
* Short field names

### Metrics persist, Events expire

* **Capped events, uncapped metrics**
  - modify cube to construct uncapped collections for metrics, and capped collections for events
  - change invalidation flusher to delete metrics, not update-with-invalid=true.

* **Calculation horizon** -- Metrics older than the calculation horizon will not be recalculated from events.

* **Drop stale events on the floor**
  - drop events on the floor if they are older than the 'invalidation' horizon (which is shorter than the calculation horizon)
  - Warn any time an invalidation extends more than 5 minutes into the past

* **Save metrics even if their value is zero**

* **Use connection pool**

* **Use Mongo 2.2+, and use separate databases for events and metrics**

### Calculation queue

Currently, the event flush-er does a range-query update setting "i=false"; under heavy load, this is surprisingly hard on the database. We've observed multiple-second pauses for invalidation; I believe mongo has to hold a write lock open while it does a range query for the metrics to update. Metric updates, by contrast, are a reasonably cheap single-row `save()`. (Side note: we tried uncapping the metrics collection and doing a `remove()`; removes also lock the database, and it was no more efficient.)

Instead, the collector's flush operation should simply trigger a direct recalculation of the metric. This would halve the number of updates and significantly reduce thevariance of load.

The challenge is to a) not have everybody in sight run off recalculating metrics; b) not complicate the metric calculation code; c) ensure correctness; d) not introduce coupling.

proposal a: evaluator contains the queue

* add an api endpoint to the evaluator:
  - endpoints: (method `DELETE`, path `1.0/metric`), and method `GET`, path `1.0/metric/refresh`. (I think this is the best match to HTTP semantics, but if anyone has strong opinions please advise.)
  - accepts start and stop; this calls deferred method on `metric.getter` and immediately returns `202 (Accepted)`.
* add code to `metric` to handle request
* make the flusher call the evaluator rather than issue an update.

Good: simple; bad: requires the evaluator be running to handle invalidations.

proposal b: database contains the queue

* add a collection to track calculation requests. rather than updating a range of metrics, flusher inserts a single entry specifying a type + time range.
* add code to coalesce all pending calculation requests for a given type and update the metrics appropriately.

## Scaling Mongo



* More ram helps

* enable `--directoryperdb` -- with the separate
* (??hypothetical enable `noprealloc=true`. Collections that have heavy write loads will fill up very quickly, and cap from there.)
* enable `cpu=true`
* enable `logappend=true`

* do not enable `smallfiles`.

logpath=/ephemeral/log/mongod.log
dbpath=/data

--slowms <value>	 Specifies the threshold (in milliseconds) above which long-running queries will appear in the log, and in the system.profiler collection if profiling is enabled.

* `--journalCommitInterval`	 -- How often to group/batch commit (ms). Default 100ms
* `--syncdelay arg`      	 -- The number of seconds between data file flushes/syncs. Default 60 (seconds).
  - The MongoDB journal file flushes almost immediately, but data files are flushed lazily to optimize performance. The default is 60 seconds. A 0 setting means never, but is not recommended and should never be used with journaling enabled. On Linux, longer settings will likely be ineffective unless /proc/sys/vm/dirty_expire_centisecs is adjusted also. Generally, set syncdelay to 4x the desired dirty_expire_centiseconds value. If backgroundFlushing.average_ms is relatively large (>= 10,000 milliseconds), consider increasing this setting as well as dirty_expire_centiseconds. Under extremely high write volume situations, a higher syncdelay value may result in more journal files as they cannot be rotated (deleted) as quickly.


* *do* use a journal

* `--rest` -- while in development, enables the REST interface.

To consider --


* connection should be `{safe: false, connectTimeoutMS=XX}`

* mongo uses 1 thread per CPU connection.

### System Tuning

Consider *enabling swap*. EC2

* ulimit -- Set file descriptor limit (`-n`) and user process limit (`-u`) to 4k+ (see etc/limits and ulimit)
* sysctl
  - overcommit
  - swappiness
* Do not use large/huge virtual memory pages (the default is small pages which is what you want)
* Use dmesg to see if box is behaving strangely
* Ensure that readahead settings for the block devices that store the dbpath are acceptable Readahead
* `/proc/sys/vm/dirty_expire_centisecs`

* cube processes
  - run with max memory size ulimit (`-m`) set to a finite value
  - (??hypothetical -- run other processes with NICE set so that mongo doesn't become target of OOM killer)

## Storage

### Replica Sets

* Ensure you are using NTP to minimize clock skew.

#### Sharding

Note that you **cannot shard** with cube: capped collections do not work in a sharded database. Replica sets are fine; see above.

## Indexes

* "Exact values first. Sorted fields next. Ranged fields after that." See [dex](http://blog.mongolab.com/2012/06/introducing-dex-the-index-bot/).
* use hints to force indexes

For Capped Collections, natural order is guaranteed to be the insertion order, making this a very efficient way to store and retrieve data in insertion order (much faster than say, indexing on a timestamp field).  In addition to forward natural order, items may be retrieved in reverse natural order. For example, to return the 50 most recently inserted items (ordered most recent to less recent) from a capped collection, you would invoke: `c=db.cappedCollection.find().sort({$natural:-1}).limit(50)`

### Storage

* Use xfs, mounted with `"noatime"`, or ext4 file system, mounted with "noatime,data=writeback,nobarrier"

* use separate disks for journals, events and metrics
* use the `--directoryperdb`
* use an SSD for metrics.
  - don't need to use an SSD for events.
* commodity drives are OK.

db.runCommand("journalLatencyTest")
You can run this command on an idle system to get a baseline sync time for journaling. In addition, it is safe to run this command on a busy system to see the sync time on a busy system (which may be higher if the journal directory is on the same volume as the data files).

* see [Baking up MongoDB](http://www.mongodb.org/display/DOCS/Backups)

### Amazon EC2  scaling

From https://github.com/infochimps-labs/ironfan/wiki/ec2-pricing_and_capacity/_edit --

```
    code         	$/mo	 $/day	 $/hr	Mem/$	CPU/$	  mem 	  cpu 	cores	cpcore	storage	 disks	ebs-opt	IO
    t1.micro		  15	  0.48	  .02	   31	   13	   .61	   0.25	    1	   .25	      -	     0	     	Lo
    m1.small		  44	  1.44	  .06	   28	   17	  1.7 	   1	    1	  1   	    160	     1	     	Med
    m1.medium		  88	  2.88	  .12	   31	   17	  3.75	   2	    2	  1   	    410	     1	     	Med
    c1.medium		 106	  3.48	  .15	   12	   34	  1.7 	   5	    2	  2.5	    350	     1	     	Med
    m1.large		 175	  5.76	  .24	   31	   17	  7.5 	   4	    2	  2   	    850	     2	     	Hi
    m1.lg+ebs		 194	  6.36	  .27	   28	   15	  7.5 	   4	    2	  2   	    850	     2	  500	Hi+EBS
    m2.xlarge		 300	  9.84	  .41	   42	   16	 17.1 	   6.5	    2	  3.25	    420	     1	     	Med
    m1.xlarge		 351	 11.52	  .48	   31	   17	 15.  	   8	    4	  2   	   1690	     4	     	Hi
    m3.xlarge		 365	 12.00	  .50	   30	   26	 15.  	  13	    4	  3.25	      -	     0	     	Med
    m1.xl+ebs		 387	 12.72	  .53	   28	   15	 15.  	   8	    4	  2   	   1690	     4	 1000	Hi+EBS
    c1.xlarge		 424	 13.92	  .58	   12	   34	  7.  	  20	    8	  2.5	   1690	     4	     	Hi
    m2.2xlarge		 599	 19.68	  .82	   42	   16	 34.2 	  13	    4	  3.25	    850	     2	     	Hi
    m3.2xlarge		 731	 24.00	 1.00	   30	   26	 30.  	  26	    8	  3.25	      -	     0	     	Hi
    cc1.4xlarge		 950	 31.20	 1.30	   18	   26	 23.  	  33.5	    8	  4.2	   1690	     4	     	10gb
    m2.4xlarge		1198	 39.36	 1.64	   42	   16	 68.4 	  26	    8	  3.25	   1690	     2	     	Hi
    m2.4xl+ebs		1235	 40.56	 1.69	   40	   15	 68.4 	  26	    8	  3.25	   1690	     2	 1000	Hi+EBS
    cg1.4xlarge		1534	 50.40	 2.10	   10	   16	 22.  	  33.5	    8	  4.2	   1690	     4	     	10gb
    cc2.8xlarge		1753	 57.60	 2.40	   25	   37	 60.5 	  88	   16	  5.5	   3370	     2	     	10gb
    hi1.4xlarge		2265	 74.40	 3.10	   20	   11	 60.5 	  35.2	   16	  2.2	   2048	 ssd 2	     	10gb
    cr1.8xlarge		2557	 84.00	 3.50	   70	   25	244.  	  88	   16	  5.5	    240	 ssd 2	     	10gb
    hs1.8xlarge		3361	110.40	 4.60	   25	    8	117.  	  35	   16	  2.2	  49152	    24	     	10gb
```

* faster cores is better than more cores+more total CPU.
  - However I don't think you're CPU-bound so the m1.xlarge with provisioned EBS probably beats the m2.xlarge.

* Provisioned IOPS for Amazon EBS

* 8 drives in a [RAID-10](http://en.wikipedia.org/wiki/Nested_RAID_levels#RAID_1.2B0) configuration
  - gives you 4x the storage of any one drive

	$ for drive in /dev/md0 /dev/xvdh{1,2,3,4} ; do sudo blockdev --setra 128 $drive ; done

* Put the oplog on the local drives
  - If you put the journal on the local drives, it will not be present if the machine dies. It will persist through a reboot. Still, it may make sense if you are using a replica set.
* do not put anything on the root partition.

EBS volumes are just fine. You have plenty of network throughput.

## Diagnostics

### Rough Numbers

For an event stream of 2400 records/s @ 1kB/record,

* network throughput  =~ 2.5 MB/s
* disk write          =~ 2.5 MB/s
* mongo inserts       =~ 2400 insert/s  
* queries             =~                (100 metrics, re-calculated 5x each)
* mongo network in    =~ 2.5 MB/s
* mongo network out   =~ k
* mongo vsize
* faults
* mongo db locked
* connections

### Tools

* disk IO:   `iostat -txm 5`
* mongostat: `mongostat --host $(hostname)`
* system:    `htop`
* network:   `ifstat 5`

### Mongostat

        insert  query update delete getmore command flushes mapped  vsize    res faults  locked db idx miss %     qr|qw   ar|aw  netIn netOut  conn       time
             0      0      0      0       0       1       0   464m  3.33g    45m      0 local:0.0%          0       0|0     0|0    62b     1k     1   17:58:22
             0      0      0      0       0       1       0   464m  3.33g    45m      0 local:0.0%          0       0|0     0|0    62b     1k     1   17:58:23

        inserts         - # of inserts per second (* means replicated op)
        query           - # of queries per second
        update          - # of updates per second
        delete          - # of deletes per second
        getmore         - # of get mores (cursor batch) per second
        command         - # of commands per second, on a slave its local|replicated
        flushes         - # of fsync flushes per second
        mapped          - amount of data mmaped (total data size) megabytes
        vsize           - virtual size of process in megabytes
        res             - resident size of process in megabytes
        faults          - # of pages faults per sec
        locked          - name of and percent time for most locked database
        idx miss        - percent of btree page misses (sampled)
        qr|qw           - queue lengths for clients waiting (read|write)
        ar|aw           - active clients (read|write)
        netIn           - network traffic in - bits
        netOut          - network traffic out - bits
        conn            - number of open connections

### Interpretation

* `backgroundFlushing.average_ms` -- if larger than 10_000 ms adjust mongo's `syncdelay` and the `dirty_expire_centiseconds` sysctl.
* virtualbytes - mappedbytes should be small
* (??hypothetical run `db.runCommand({compact:'collectionname'})` to compact?)
* `mongod --repair` -- will put a heavy load on your DB
  - you may see some 'yield' warnings when doing a repair; they're harmless

* Dump stats on all databases and collections:

    db.foo.stats()
    var mongo_stats = {} ; db._adminCommand("listDatabases").databases.forEach(function (d) {mdb = db.getSiblingDB(d.name); mongo_stats[d.name] = {} ; mongo_stats[d.name]["_stats"] = mdb.stats(); mdb.getCollectionNames().forEach(function(c) {mongo_stats[d.name][mdb[c].name] = mdb[c].stats(); })}); printjson(mongo_stats);

* [Database profiling](http://www.mongodb.org/display/DOCS/Database+Profiler)

    db.getProfilingLevel()
    db.setProfilingLevel(level) 0=off 1=record slow queries 2= record all queries
    mongod --profile=1 --slowms=15

    # view queries against collection test.foo:
    db.system.profile.find( { info: /test.foo/ } )
    # newest info first:
    db.system.profile.find().sort({$natural:-1})

  - `nscanned` is much higher than nreturned, the database is scanning many objects to find the target objects. Consider creating an index to improve this.
  - `reslen` A large number of bytes returned (hundreds of kilobytes or more) causes slow performance. Consider passing `find()` a second parameter of the member names you require.
  - `fastmodinsert` -- better than `upsert`
  - `moved`         -- Indicates the update moved the object on disk. bad.
  - `key updates`   -- had to reindex. bad.

* [diagnostic console](http://localhost:28017/)
  - start with `--rest` -- while in development, enables the REST interface.
