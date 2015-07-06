'use strict';

var fs = require('graceful-fs');
var path = require('path');
var resumer = require('resumer');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var cache = require('memory-cache');

var readFile = Promise.promisify(fs.readFile);
var writeFile = Promise.promisify(fs.writeFile);

// Read a file from cache, or from the file system if not seen previously
var cacheRead = function (src) {
    if (cache.get(src)) {
        return new Promise(function (resolve) {
            resolve(cache.get(src));
        });
    } else {
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
        if (typeof cached === 'string') {
            return resumer().queue(cached).end();
        }
        return cached;
    } else {
        var fsStream = fs.createReadStream(src, {encoding: 'utf8'});
        cache.put(src, fsStream);
        return fsStream;
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

// API
module.exports = {
    readFile:         cacheRead,
    createReadStream: cacheReadStream,
    expire:           cacheExpire,
    copy:             copy,
    concat:           concat
};
