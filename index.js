'use strict';

var mandrill = require('node-mandrill-retry')
  , debug = require('diagnostics')('emeeuw')
  , dollars = require('dollars')
  , Temper = require('temper')
  , md = require('./markdown')
  , juice = require('juice2')
  , fuse = require('fusing')
  , path = require('path')
  , fs = require('fs');

/**
 * Emeeuw e-mail services llc inc.
 *
 * Options:
 *
 * - `click`: Track clicks in e-mail, defaults to true.
 * - `dryrun` Don't actually send the damn e-mail.
 * - `open`: Track e-mail open, defaults to true.
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

  this.dryrun = 'dryrun' in options ? options.dryrun : false;
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
    spec.engine = path.extname(spec.filename) || 'html';

    spec.name = spec.name || path.basename(spec.file, spec.extension);
    spec.template = spec.filename +'.'+ spec.engine;

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
  var message = dollars.object.clone(this.message)
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
      message.html = html;

      if (err) {
        debug('failed to inline the css: '+ err.message);
        return fn(err, message);
      }

      //
      // Force async execution to prevent our stacktrace from being eaten by
      // juice. This process.nextTick can be removed once:
      //
      //   https://github.com/andrewrk/juice/issues/18
      //
      // Has been fixed.
      //
      process.nextTick(function next() {
        if (emeeuw.dryrun) return fn(undefined, message);

        emeeuw.mandrill('/messages/send', {
          message: message
        }, fn);
      });
    });
  }

  this.find(template, options, function finder(err, spec) {
    if (err) return fn(err);

    spec = dollars.object.clone(spec);
    emeeuw.merge(spec, spec.meta);
    emeeuw.merge(spec, options);

    if (!spec.html) spec.html = spec.render(spec);

    emeeuw.merge(message, spec);

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
Emeeuw.prototype.find = function find(name, data, fn) {
  var spec = this.templates[name]
    , emeeuw = this;

  if (!spec) return fn(new Error('Unknown template: '+ name));
  if (spec.meta) return fn(undefined, spec);

  spec.render = this.temper.fetch(spec.template, spec.engine).server;
  spec.text = this.temper.fetch(spec.file, spec.engine).server(data);

  md(spec.text, function compiled(err, markdown) {
    if (err) {
      debug('failed to process the markdown due to: '+ err.message);
      return fn(err);
    }

    spec.meta = emeeuw.meta(spec.text);
    spec.markdown = markdown;

    fn(undefined, spec);
  });
};

/**
 * Extract metadata out of the source markdown file. We assume that metadata is
 * stored in a special URL format so it will not be included in the outputted
 * markdown:
 *
 * ```md
 * [meta:subject]: <> (This is the content for the meta `subject` key.)
 * ```
 *
 * All metadata specifications should be prefixed `meta:`
 *
 * @param {String} text Markdown body.
 * @returns {Object}
 * @api private
 */
Emeeuw.prototype.meta = function meta(text) {
  var parser = /\[meta:([^\]]+?)\]:\s<>\s\(([^\)]+?)\)/i;

  return text.split(/\n/).reduce(function reduce(meta, line) {
    if (!parser.test(line)) return meta;

    var data = parser.exec(line);
    meta[data[1]] = data[2];

    return meta;
  }, {});
};

/**
 * Destroy the Emeeuw instance and free all memory.
 *
 * @returns {Boolean}
 * @api public
 */
Emeeuw.prototype.destroy = function destroy() {
  if (!this.templates) return false;

  this.temper.destroy();
  this.message = this.templates = this.temper = null;

  return true;
};

//
// Expose the interface.
//
module.exports = Emeeuw;
