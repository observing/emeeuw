describe('emeeuw', function () {
  'use strict';

  var emeeuw
    , path = require('path')
    , Emeeuw = require('./')
    , assume = require('assume');

  beforeEach(function () {
    emeeuw = new Emeeuw('fake string', {
      from: 'hello@world.com',
      dryrun: true
    });
  });

  afterEach(function () {
    emeeuw.destroy();
  });

  it('is exported as function', function () {
    assume(Emeeuw).is.a('function');
  });

  it('can be constructed without new', function () {
    emeeuw.destroy();
    emeeuw = Emeeuw('dafadsfa');

    assume(emeeuw).is.instanceOf(Emeeuw);
  });

  it('can turnoff open tracking', function () {
    assume(emeeuw.message.track_opens).is.true();
    emeeuw.destroy();

    emeeuw = new Emeeuw('dafafa', { open: false });
    assume(emeeuw.message.track_opens).is.false();
  });

  it('can turnoff click tracking', function () {
    assume(emeeuw.message.track_clicks).is.true();
    emeeuw.destroy();

    emeeuw = new Emeeuw('dafafa', { click: false });
    assume(emeeuw.message.track_clicks).is.false();
  });

  describe('#from', function () {
    it('returns it self', function () {
      assume(emeeuw.templates.folder).is.a('undefined');
      assume(emeeuw.from(path.join(__dirname, 'fixtures'))).equals(emeeuw);
      assume(emeeuw.templates.object).is.a('undefined');
    });

    it('allows absolute paths to files', function () {
      assume(emeeuw.templates.file).is.a('undefined');
      emeeuw.from(path.join(__dirname, 'fixtures', 'file.md'));
      assume(emeeuw.templates.file).is.a('object');
    });

    it('only allows markdown files as source', function () {
      assume(emeeuw.templates.test).is.a('undefined');
      emeeuw.from(path.join(__dirname, 'test.js'));
      assume(emeeuw.templates.test).is.a('undefined');
    });
  });

  describe('#send', function () {
    beforeEach(function () {
      emeeuw.from(path.join(__dirname, 'fixtures'));
    });

    it('transforms the markdown to html', function (next) {
      emeeuw.send('folder', {
        to: 'foo@bar.com'
      }, function (err, message) {
        if (err) return next(err);

        assume(message).is.a('object');
        assume(message.html).is.a('string');
        assume(message.html).includes('Template from a folder');
        assume(message.html).includes('<h1>');
        assume(message.html).includes('</h1>');

        next();
      });
    });

    it('transforms the ejs to html', function (next) {
      emeeuw.send('another', {
        to: 'foo@bar.com',
        engine: 'EJS-lol'
      }, function (err, message) {
        if (err) return next(err);

        assume(message).is.a('object');
        assume(message.html).is.a('string');
        assume(message.html).includes('Hello I');
        assume(message.html).includes('EJS-lol');
        assume(message.html).includes('<h2>');
        assume(message.html).includes('</h2>');

        next();
      });
    });

    it('merges in the subject', function (next) {
      emeeuw.send('folder', {
        to: 'foo@bar.com',
        subject: 'foo'
      }, function (err, message) {
        if (err) return next(err);

        assume(message).is.a('object');
        assume(message.subject).equals('foo');
        assume(message.from_email).equals('hello@world.com');

        next();
      });
    });

    it('prefers options over meta data', function (next) {
      emeeuw.send('file', {
        to: 'foo@bar.com',
        subject: 'foo'
      }, function (err, message) {
        if (err) return next(err);

        assume(message).is.a('object');
        assume(message.subject).equals('foo');
        assume(message.from_email).equals('hello@world.com');

        next();
      });
    });

    it('merges meta data in the options', function (next) {
      emeeuw.send('file', {
        to: 'foo@bar.com'
      }, function (err, message) {
        if (err) return next(err);

        assume(message).is.a('object');
        assume(message.subject).equals('This is the subject, extracted from meta data.');
        assume(message.from_email).equals('hello@world.com');

        next();
      });
    });

    it('allows custom html & text', function (next) {
      emeeuw.send('folder', {
        to: 'foo@bar.com',
        subject: 'foo',
        text: 'foobar',
        html: '<strong>lol</strong>'
      }, function (err, message) {
        if (err) return next(err);

        assume(message).is.a('object');
        assume(message.html).includes('<strong>lol</strong>');
        assume(message.text).equals('foobar');

        next();
      });
    });

    it('receives an error when you send an unknown template', function (next) {
      emeeuw.send('hello i dont really exist as template', {
        to: 'foo@bar.com',
      }, function (err, message) {
        assume(err.message).includes('hello i dont really');
        assume(err.message).includes('Unknown');

        next();
      });
    });
  });

  describe('#destroy', function () {
    it('nukes all references', function () {
      assume(emeeuw.destroy()).is.true();

      assume(emeeuw.templates).equals(null);
      assume(emeeuw.temper).equals(null);
    });

    it('returns false after second destruction', function () {
      assume(emeeuw.destroy()).is.true();
      assume(emeeuw.destroy()).is.false();
      assume(emeeuw.destroy()).is.false();
    });
  });
});
