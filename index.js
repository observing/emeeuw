'use strict';

var mandrill = require('node-mandrill-retry')
  , debug = require('diagnostics')('emeeuw')
  , Temper = require('temper')
  , juice = require('juice2')
  , fuse = require('fusing')
  , path = require('path')
  , md = require('marked')
  , fs = require('fs');

/**
 * Emeeuw e-mail services llc inc.
 *
 * Options:
 *
 * - `open`: Track e-mail open, defaults to true.
 * - `click`: Track clicks in e-mail, defaults to true.
 *
 * @constructor
 * @param {String} api The Mandrill API key.
 * @param {Object} options Configuration.
 * @api public
 */
function Emeeuw(api, options) {
  if (!this) return new Emeeuw(api, options);
  options = options || {};

  this.mandrill = mandrill(api);

  this.message = {
    headers: {
      'Content-type': 'text/html; charset=UTF-8'
    },
    track_opens: 'open' in options ? options.open : true,
    track_clicks: 'click' in options ? options.click : true,
    subject: options.subject,
    from_email: options.from,
    to: options.to
  };

  this.templates = Object.create(null);
  this.temper = new Temper();
}

fuse(Emeeuw, require('eventemitter3'));

/**
 * Add a new template source.
 *
 * @TODO add support for different template engines.
 * @param {String} location
 * @returns {Emeeuw}
 * @api public
 */
Emeeuw.prototype.from = function from(location) {
  var stat = fs.statSync(location)
    , files = [];

  if (stat.isFile()) files.push({ file: location });
  else if (stat.isDirectory()) fs.readdirSync(location).forEach(function each(file) {
    file = path.join(location, file);
    stat = fs.statSync(file);

    if (stat.isDirectory()) {
      return files = files.concat(fs.readdirSync(file).map(function map(name) {
        return {
          file: path.join(file, name),
          name: path.basename(file)
        };
      }));
    }

    files.push({ file: file });
  });

  files.filter(function filter(spec) {
    return '.md' === path.extname(spec.file);
  }).map(function map(spec) {
    spec.extension = path.extname(spec.file);
    spec.filename = spec.file.replace(spec.extension, '');

    spec.name = spec.name || path.basename(spec.file, spec.extension);
    spec.text = fs.readFileSync(spec.filename +'.md', 'utf-8');
    spec.template = spec.filename +'.html';

    return spec;
  }).forEach(function add(spec) {
    if (spec.name in this.templates) debug('duplicate template %s', spec.name);

    this.templates[spec.name] = spec;
  }, this);

  return this;
};

/**
 * Send an email template based on the template name.
 *
 * @param {String} template Name of the template we're about to send
 * @param {Object} options Options for sending.
 * @param {Function} fn Completion callback.
 * @returns {Emeeuw}
 * @api public
 */
Emeeuw.prototype.send = function send(template, options, fn) {
  var message = this.merge({}, this.message)
    , emeeuw = this;

  /**
   * Inline the CSS and send the e-mail to all the things.
   *
   * @param {Object} spec Template specification.
   * @api private
   */
  function inline(spec) {
    juice.juiceContent(message.html, {
      url: 'file://'+ path.resolve(process.cwd(), spec.template)
    }, function juicy(err, html) {
      if (err) {
        debug('failed to inline the css: '+ err.message);
        return fn(err);
      }

      message.html = html;
      emeeuw.mandrill('/messages/send', {
        message: message
      }, fn);
    });
  }

  this.find(template, function finder(err, spec) {
    if (err) return fn(err);

    options.text = options.text || spec.text;
    options.html = options.html || spec.render(emeeuw.merge(options, spec));
    emeeuw.merge(message, options);

    if ('string' === typeof message.to) message.to = { email: message.to };
    if (!Array.isArray(message.to)) message.to = [message.to];

    inline(spec);
  });

  return this;
};

/**
 * Find the compiled template based on the provided name. If it's not yet
 * compiled we're going to compile all the markdowns and then send it.
 *
 * @param {String} name Name of the template.
 * @param {Function} fn Completion callback.
 * @api private
 */
Emeeuw.prototype.find = function find(name, fn) {
  var spec = this.templates[name];

  if (!spec) return fn(new Error('Unknown template: '+ name));
  if (spec.render) return fn(undefined, spec);

  spec.render = this.temper.fetch(spec.template).server;

  md(spec.text, { gfm: true, tables: true }, function compiled(err, markdown) {
    if (err) {
      debug('failed to process the markdown due to: '+ err.message);
      return fn(err);
    }

    spec.markdown = markdown;
    fn(undefined, spec);
  });
};

//
// Expose the interface
//
module.exports = Emeeuw;
