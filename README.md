# Cacheable FS

Cacheable file system methods for holding file reads in memory and optionally automatically expiring them with a file system watcher (using [Gaze](https://github.com/shama/gaze)).

## Usage

```javascript
var cfs = require('cacheable-fs');

// Promise style
cfs.cache.readFile('path/to/file.txt').then(function(content) {
    // ... do something with content 
});

// Stream style
cfs.cache.createReadStream('path/to/file.txt')
    .pipe( ... );
```

## Methods

### Promisified

All of the following methods will return a promise

* `cache.readFile(path)` - Read a file
* `cache.concat(files)` - Concatenates an array of files
* `cache.copy(path)` - Copies a file from one location to another creating directories
* `readFile(path, [...])` - Promisified wrapper to fs.readFile
* `writeFile(path, [...])` - Promisified wrapper to fs.writeFile

### Other

* `cache.createReadStream(path)` - Read a file (returns a stream)
* `cache.expire(path)` -  Expire a given path from cache
* `cache.getCache()` - Returns the raw cache object (debugging)
* `cache.watch(fn)` - Watch the file system and trigger a callback on each change or deletion. Callback is `fn(eventName, path)`.
* `cache.unwatch()` - Stop watching the file system

## Properties

* `fs` - Exposing [graceful-fs](https://github.com/isaacs/node-graceful-fs)
* `watcher` - Exposing [Gaze](https://github.com/shama/gaze)