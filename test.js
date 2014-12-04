describe('emeeuw', function () {
  'use strict';

  var Emeeuw = require('./')
    , assume = require('assume');

  it('is exported as function', function () {
    assume(Emeeuw).is.a('function');
  });
});
