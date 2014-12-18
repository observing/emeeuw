describe('emeeuw', function () {
  'use strict';

  var emeeuw
    , path = require('path')
    , Emeeuw = require('./')
    , assume = require('assume');

  beforeEach(function () {
    emeeuw = new Emeeuw('fake string', {
      dryrun: true
    });
  });

  afterEach(function () {
    emeeuw.destroy();
  });

  it('is exported as function', function () {
    assume(Emeeuw).is.a('function');
  });

  describe('#from', function () {
    it('returns it self', function () {
      assume(emeeuw.from(path.join(__dirname, 'fixtures'))).equals(emeeuw);
    });

    it('allows absolute paths to files', function () {
      assume(emeeuw.templates.file).is.a('undefined');

      emeeuw.from(path.join(__dirname, 'fixtures', 'file.md'));

      assume(emeeuw.templates.file).is.a('object');
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
