# Parity baseline

`baseline/<slug>.json` records how each post rendered in the browser before the
move from JSON blocks to Markdown: title, headings, article text, tags, table of
contents and structure counts. `npm run parity` builds the site and compares the
same fields from every new static page. It exits with an error if any post differs.

The baseline is a regression snapshot. When a post is edited on purpose, update
its baseline file to match, and note the change here.

## Recorded edits

- `url-dns-internet`: three semicolons in the prose were replaced with full stops
  or a comma, to follow the site's writing rules. No other words changed.
