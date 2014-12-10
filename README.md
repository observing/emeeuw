# emeeuw

[![Version npm][version]](http://browsenpm.org/package/emeeuw)[![Build Status][build]](https://travis-ci.org/observing/emeeuw)[![Dependencies][david]](https://david-dm.org/observing/emeeuw)[![Coverage Status][cover]](https://coveralls.io/r/observing/emeeuw?branch=master)

[version]: http://img.shields.io/npm/v/emeeuw.svg?style=flat-square
[build]: http://img.shields.io/travis/observing/emeeuw/master.svg?style=flat-square
[david]: https://img.shields.io/david/observing/emeeuw.svg?style=flat-square
[cover]: http://img.shields.io/coveralls/observing/emeeuw/master.svg?style=flat-square

## Installation

The module is released in the public npm registry and can be installed using:

```
npm install --save emeeuw
```

## Usage

In all examples we assume that you have a valid [mandrill] account and API key
as we're a wrapper around their API (but we are more then happy to add more
email providers through pull requests).

```js
'use strict';

var Emeeuw = require('emeeuw')
  , emeeuw = new Emeeuw(process.env.MANDRILL_API, { /* options */ });
```

As you can see in the snippet above we accept 2 arguments:

1. The API key for the Mandrill API.
2. An optional object which allows you to specify some messaging defaults:
   - `open`: Track open of emails, defaults to `true`.
   - `click`: Track clicks in emails, defaults to `true`.
   - `subject`: Default subject of the emails.
   - `from`: Default from email address.
   - `to`: Default to address.

### Emeeuw.from

Add a new directory of template sources. It accepts one argument and it should
an absolute path to a directory or a filename which points a markdown file.

```js
emeeuw.from('/my/email/directory')
      .from('/path/to/specific/test.md');
```

The method will walk through the directories and files searching for markdown
sources that have a `.md` extension. If we find markdown files in the first
level of the directory we assume that the filename is the name of the template.
If we find another directory we assume that the folder name is the name of the
template.

For every markdown we assume that there is a file with **exactly** the same in
the folder but with a different extension. The extension can be an extension
that is accepted and parsed by [Temper]. So if you have a `foobar.md` there
should also be `foobar.html` (or any other extension).

When we are sending the emails we will use the contents of the markdown file as
plain/text body of the email. And the rendered result of the template file will
be used as HTML body.

### Emeeuw.send

After adding template files to your `emeeuw` instance we can start sending emails.
This method requires 3 arguments:

1. The name of the template you want send
2. Options to send the message.
3. Completion callback.

```js
emeeuw.send('example', {
  to: 'example@domain.name',
  subject: 'My first mass mailing'
}, function (err, resp) {

});
```

## License

MIT

[mandrill]: http://mandrill.com/
[Temper]: https://github.com/bigpipe/temper#temper
