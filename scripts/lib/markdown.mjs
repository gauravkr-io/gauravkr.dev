/**
 * Markdown to HTML for posts.
 *
 * The output uses the same classes the old block renderer produced, so the
 * existing article styles apply unchanged. Raw HTML in a post is switched off,
 * which keeps the escaping rule intact: authors write Markdown, never markup.
 *
 * Syntax beyond plain Markdown:
 *   :::note Title        callout (also :::warning, :::tip, :::info), closed by :::
 *   ```mermaid           diagram, drawn in the browser
 *   ![alt](src "caption")  a figure when it sits alone on a line
 *   > text
 *   > -- Name            pull quote with an attribution
 */
import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Same rule as slugifyHeading in assets/js/utils.js, so anchors never change. */
export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

const CALLOUTS = ['note', 'warning', 'tip', 'info'];

export function createMarkdown() {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

  /* Headings carry an id and are collected for the table of contents. */
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const inline = tokens[idx + 1];
    const text = (inline.children ?? [])
      .filter((t) => t.type === 'text' || t.type === 'code_inline')
      .map((t) => t.content)
      .join('');
    const id = slugifyHeading(text);
    tokens[idx].attrSet('id', id);
    env.headings ??= [];
    env.headings.push({ level: Number(tokens[idx].tag.slice(1)), id, text });
    return self.renderToken(tokens, idx, options);
  };

  /* Code blocks and diagrams. */
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const language = token.info.trim().split(/\s+/)[0];
    const code = token.content.replace(/\n$/, '');
    if (language === 'mermaid') {
      return `<div class="mermaid-block mermaid">${escapeHtml(code)}</div>\n`;
    }
    return (
      `<div class="code-block">\n<div class="code-block__head">\n<span>${escapeHtml(language || 'code')}</span>\n</div>\n` +
      `<pre><code>${escapeHtml(code)}</code></pre>\n</div>\n`
    );
  };

  /* Tables sit in a scroll wrapper. */
  md.renderer.rules.table_open = () => '<div class="table-wrap">\n<table>\n';
  md.renderer.rules.table_close = () => '</table>\n</div>\n';

  /* Images: lazy by default, and a lone image becomes a captioned figure. */
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const alt = self.renderInlineAsText(token.children, options, env);
    return `<img src="${escapeHtml(token.attrGet('src'))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
  };

  md.renderer.rules.figure = (tokens, idx, options, env, self) => {
    const image = tokens[idx].children[0];
    const caption = image.attrGet('title');
    const img = md.renderer.rules.image([image], 0, options, env, self);
    return (
      `<figure class="post-figure">\n${img}\n` +
      (caption ? `<figcaption>${md.renderInline(caption)}</figcaption>\n` : '') +
      `</figure>\n`
    );
  };

  /* External links open safely in a new tab. */
  const defaultLink = md.renderer.rules.link_open ?? ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') ?? '';
    if (/^https?:\/\//.test(href)) {
      tokens[idx].attrSet('target', '_blank');
      tokens[idx].attrSet('rel', 'noopener noreferrer');
    }
    return defaultLink(tokens, idx, options, env, self);
  };

  /* Callouts: ":::note Title". */
  for (const name of CALLOUTS) {
    md.use(container, name, {
      marker: ':',
      validate: (params) => params.trim().split(/\s+/)[0] === name,
      render(tokens, idx) {
        const token = tokens[idx];
        if (token.nesting === 1) {
          const title = token.info.trim().slice(name.length).trim();
          const variant = name === 'warning' ? ' callout--warning' : '';
          return (
            `<aside class="callout${variant}">\n` +
            (title ? `<p class="callout__title">${escapeHtml(title)}</p>\n` : '')
          );
        }
        return '</aside>\n';
      }
    });
  }

  md.core.ruler.push('post_shapes', (state) => {
    const tokens = state.tokens;

    // Paragraphs inside a callout take the callout text style.
    let depth = 0;
    for (const token of tokens) {
      if (token.type.startsWith('container_') && token.type.endsWith('_open')) depth += 1;
      else if (token.type.startsWith('container_') && token.type.endsWith('_close')) depth -= 1;
      else if (depth > 0 && token.type === 'paragraph_open') token.attrSet('class', 'callout__text');
    }

    // A paragraph holding only an image becomes a figure.
    for (let i = 0; i < tokens.length - 2; i += 1) {
      const [open, inline, close] = [tokens[i], tokens[i + 1], tokens[i + 2]];
      if (
        open.type === 'paragraph_open' &&
        close.type === 'paragraph_close' &&
        inline.children?.length === 1 &&
        inline.children[0].type === 'image'
      ) {
        const figure = new state.Token('figure', '', 0);
        figure.children = inline.children;
        tokens.splice(i, 3, figure);
      }
    }

    // Blockquotes become pull quotes, and a trailing "-- Name" becomes the citation.
    let quoteDepth = 0;
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token.type === 'blockquote_open') {
        token.attrSet('class', 'pull-quote');
        quoteDepth += 1;
      } else if (token.type === 'blockquote_close') {
        quoteDepth -= 1;
        for (let j = i - 1; j > 0; j -= 1) {
          if (tokens[j].type === 'paragraph_close' && tokens[j - 2].type === 'paragraph_open') {
            const inline = tokens[j - 1];
            if (inline.content.startsWith('-- ')) {
              inline.content = inline.content.slice(3);
              inline.children[0].content = inline.children[0].content.replace(/^-- /, '');
              tokens[j - 2].tag = 'cite';
              tokens[j].tag = 'cite';
            }
            break;
          }
          if (tokens[j].type === 'blockquote_open') break;
        }
      }
    }
  });

  return md;
}

const shared = createMarkdown();

/** Renders a post body. Returns the HTML and the headings found, in order. */
export function renderMarkdown(body) {
  const env = {};
  const html = shared.render(body, env);
  return { html, headings: env.headings ?? [] };
}

/** Plain text of a body, used for reading time. */
export function wordCount(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_#>|:\-\[\]()!]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}
