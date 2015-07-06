'use strict';
/*eslint no-unused-vars: 0*/
/*globals describe, it, afterEach*/
var should = require('chai').should();
var expect = require('chai').expect;
var map = require('map-stream');
var rimraf = require('rimraf');
var path = require('path');
var fs = require('fs');
var cache = require('memory-cache');

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
        this.fs.readFile(src).then(function(content) {
            content.should.equal('File A');
            expect(cache.keys()).to.contain(src);
            done();
        });
    });

    it('can stream a file source', function(done) {
        var src = path.join(fixtures, 'fileB.txt');
        this.fs.createReadStream(src)
            .pipe(map(function (content, cb) {
                content.should.equal('File B');
                expect(cache.keys()).to.contain(src);
                cb(null, content);
            }))
            .on('end', done);
    });

    it('can expire cache', function(done) {
        var src = path.join(fixtures, 'fileB.txt');
        this.fs.expire(src);
        expect(cache.keys()).not.to.contain(src);
        done();
    });

    it('can concatenate multiple files', function(done) {
        var srcs = [path.join(fixtures, 'fileA.txt'), path.join(fixtures, 'fileB.txt')];
        this.fs.concat(srcs).then(function (content) {
            content.should.equal('File AFile B');
            done();
        });
    });

    it('can concatenate multiple files with transformations', function(done) {
        var srcs = [path.join(fixtures, 'fileA.txt'), path.join(fixtures, 'fileB.txt')];
        this.fs.concat(srcs, function (filePath, contents) {
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
        this.fs.copy(src, target).then(function() {
            expect(fs.statSync(target).isFile()).to.be.equal(true);
            done();
        });
    });
});
