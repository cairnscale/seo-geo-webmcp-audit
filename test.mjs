import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectHtmlSignals } from './index.mjs';

test('inspectHtmlSignals validates canonical, markdown alternate, robots, and JSON-LD', () => {
  const html = `<!doctype html><html><head>
    <meta name="robots" content="index, follow, max-snippet:-1">
    <link rel="canonical" href="https://example.uk/">
    <link rel="alternate" type="text/markdown" href="https://example.uk/md/index.md">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite"}</script>
  </head><body></body></html>`;
  const res = inspectHtmlSignals(html);
  assert.equal(res.canonical, 'https://example.uk/');
  assert.equal(res.markdownAlternate, 'https://example.uk/md/index.md');
  assert.equal(res.validJsonLdCount, 1);
  assert.equal(res.invalidJsonLdCount, 0);
});
