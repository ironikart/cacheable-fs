'use strict';

var fs = require('graceful-fs');
var path = require('path');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var cache = require('memory-cache');
var through = require('through2');
var StringStream = require('string-stream');

var readFile = Promise.promisify(fs.readFile);
var writeFile = Promise.promisify(fs.writeFile);

var hits = 0;
var misses = 0;

// Read a file from cache, or from the file system if not seen previously
var cacheRead = function (src) {
    if (cache.get(src)) {
        hits += 1;
        return new Promise(function (resolve) {
            resolve(cache.get(src));
        });
    } else {
        misses += 1;
        var read = readFile(src, {encoding: 'utf8'});
        read.then(function (data) {
            cache.put(src, data);
        });
        return read;
    }
};

// Get a read stream of a file, or cached version if stored
var cacheReadStream = function (src) {
    var cached = cache.get(src);
    if (cached) {
        hits += 1;
        if (typeof cached === 'string') {
            var cachedStream = new StringStream();
            cachedStream.write(cached);
            return cachedStream;
        }
        return cached;
    } else {
        misses += 1;
        var content = '';
        return fs.createReadStream(src, {encoding: 'utf8'}).pipe(through(function(chunk, enc, cb) {
            content += chunk.toString();
            cb(null, chunk);
        }, function(done) {
            cache.put(src, content);
            done();
        }));
    }
};

// Expire a cache by deleting it from the local cache store
var cacheExpire = function (src) {
    cache.del(src);
};

// Concatenate multiple files into a single source with an optional transform function
// which passes the array of file contents
var concat = function (files, transformFn) {
    return new Promise(function (resolve) {
        Promise.all(
            files.map(function (src) {
                return cacheRead(src);
            })
        ).then(function (contents) {
            if (typeof transformFn === 'function') {
                contents = contents.map(function(content, i) {
                    return transformFn.call(this, files[i], content);
                });
            }
            resolve(contents.join(''));
        });
    });
};

// Copy a file from one location to another (cached read)
var copy = function(src, target) {
    return new Promise(function (resolve, reject) {
        mkdirp(path.dirname(target), function(err) {
            if (err) {
                return reject(err);
            }

            cacheReadStream(src)
              .pipe(fs.createWriteStream(target))
              .on('error', reject)
              .on('finish', resolve);
        });
    });
};

function resetStats() {
    hits = 0;
    misses = 0;
}

function getStats(reset) {
    var stats = {
        hits:   hits,
        misses: misses
    };
    if (reset) {
        resetStats();
    }
    return stats;
}

// API
module.exports = {
    readFile:         cacheRead,
    createReadStream: cacheReadStream,
    expire:           cacheExpire,
    copy:             copy,
    concat:           concat,
    stats:            getStats,
    resetStats:       resetStats
};
