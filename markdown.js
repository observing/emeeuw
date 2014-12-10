'use strict';

var debug = require('diagnostics')('emeeuw:markdown')
  , pygmentize = require('pygmentize-bundled')
  , md = require('marked');

/**
 * A custom marked renderer so we can attempt to render the markup in exactly
 * the same
 *
 * @type {marked.Renderer}
 * @private
 */
var renderer = new md.Renderer();

//
// Override the code renderer as our markup is already created by pygments.
//
renderer.code = function render(code, lang, escape) {
  return code;
};

//
// Correctly render the headers according to github URL scheme.
//
renderer.heading = function header(text, depth, escape) {
  var id = text.replace(/[\.|\#]/g, '')     // Remove dots and others.
               .replace(/[^\w]+/g, '-')     // All none-words are now -'s>.
               .replace(/[\-]+$/, '')       // Remove suffixed -'s.
               .toLowerCase();              // Always lowercase things.

  return [
    '<h', depth, '>',
      '<a name="', id, '" class="anchor" href="#', id, '"></a>',
      text,
    '</h', depth, '>'
  ].join('') + '\n';
};

/**
 * Render markdown files.
 *
 * @param {String} content The Markdown content that we should render.
 * @param {Function} fn The callback
 * @api private
 */
function markdown(content, fn) {
  var id = 0;

  /**
   * Render a code block using pygmentize.
   *
   * @param {String} code The code block.
   * @param {String} lang The programming language.
   * @param {function} fn The callback.
   * @api private
   */
  function highlight(code, lang, fn) {
    pygmentize({
      lang: lang || 'text',               // The programming language.
      format: 'html',                     // Output format.
      options: {
        linenos: 'table',                 // Add line numbers.
        lineanchors: 'snippet-'+ (++id),  // Prefix is based on snippet count.
        anchorlinenos: true,              // Wrap line numbers in <a> elements.
        cssclass: 'snippet'               // Use our CSS class.
      }
    }, code, function highlighted(err, data) {
      if (err) {
        if (lang !== 'text') {
          debug('failed to highlight code snippet in %s, attempting in text', lang);
          return highlight(code, 'text', fn);
        }

        debug('failed to highlight code snippet in %s', lang);
        return fn(err);
      }

      fn(err, data.toString());
    });
  }

  md(content, {
    highlight: highlight,
    renderer: renderer,
    tables: true,
    gfm: true
  }, fn);
}

//
// Expose the markdown renderer.
//
module.exports = markdown;
