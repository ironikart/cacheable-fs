'use strict';
/*eslint no-unused-vars: 0*/
/*globals describe, it, afterEach*/
var should = require('chai').should();
var expect = require('chai').expect;
var map = require('map-stream');
var rimraf = require('rimraf');
var path = require('path');
var fs = require('fs');

describe('cache fs', function() {
    var fixtures = path.join(__dirname, 'fixtures');
    var tmpDir = path.resolve(__dirname, '.tmp');

    afterEach(function (done) {
        rimraf(tmpDir, done);
    });

    it('can be required without throwing', function() {
        this.fs = require('../lib/fs');
    });

    it('can read a file source (promise style)', function(done) {
        var src = path.join(fixtures, 'fileA.txt');
        this.fs.cache.readFile(src).then(function(content) {
            content.should.equal('File A');
            expect(this.fs.cache.getCache()).to.have.any.key(src);
            done();
        }.bind(this));
    });

    it('can stream a file source', function(done) {
        var src = path.join(fixtures, 'fileB.txt');
        this.fs.cache.createReadStream(src)
            .pipe(map(function (content, cb) {
                content.should.equal('File B');
                expect(this.fs.cache.getCache()).to.have.any.key(src);
                cb(null, content);
            }.bind(this)))
            .on('end', done);
    });

    it('can expire cache', function(done) {
        var src = path.join(fixtures, 'fileB.txt');
        this.fs.cache.expire(src);
        expect(this.fs.cache.getCache()).not.to.have.any.key(src);
        done();
    });

    it('can concatenate multiple files', function(done) {
        var srcs = [path.join(fixtures, 'fileA.txt'), path.join(fixtures, 'fileB.txt')];
        this.fs.cache.concat(srcs).then(function (content) {
            content.should.equal('File AFile B');
            done();
        });
    });

    it('can concatenate multiple files with transformations', function(done) {
        var srcs = [path.join(fixtures, 'fileA.txt'), path.join(fixtures, 'fileB.txt')];
        this.fs.cache.concat(srcs, function (filePath, contents) {
            return '/*banner*/'+contents;
        }).then(function (content) {
            content.should.equal('/*banner*/File A/*banner*/File B');
            done();
        });
    });

    it('can copy files from one location to another', function(done) {
        var filename = 'fileA.txt';
        var src = path.join(fixtures, filename);
        var target = path.join(tmpDir, filename);
        this.fs.cache.copy(src, target).then(function() {
            expect(fs.statSync(target).isFile()).to.be.equal(true);
            done();
        });
    });

    it('can watch the file system for changes and expire cache', function(done) {
        var filename = 'fileB.txt';
        var src = path.join(fixtures, filename);
        var target = path.join(tmpDir, filename);
        this.fs.cache.copy(src, target).then(function() {
            expect(fs.statSync(target).isFile()).to.be.equal(true);
            return this.fs.cache.readFile(target);
        }.bind(this)).then(function() {
            expect(this.fs.cache.getCache()).to.have.any.key(target);

            // Start the watcher and pass a callback
            this.fs.watch(function(evt, file) {
                if (evt === 'changed' && file === target) {
                    var newCache = this.fs.cache.getCache();
                    expect(newCache).not.to.have.any.key(target);
                    done();
                }
            }.bind(this));

            var watched = this.fs.watcher.watched();
            var watchedDir = path.dirname(target)+'/';

            // has it been watched properly?
            expect(watched).to.have.any.key(watchedDir);
            expect(watched[watchedDir]).to.have.length(1);
            expect(watched[watchedDir][0]).to.equal(target);

            // Modify it to test cache expiry
            fs.writeFileSync(target, 'Modified File B');
        }.bind(this));
    });
});
