#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

export function inspectHtmlSignals(html) {
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const mdAltMatch = html.match(/<link[^>]+type=["']text\/markdown["'][^>]+href=["']([^"']+)["']/i);
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const parsedSchemas = ldBlocks.map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  });
  return {
    canonical: canonicalMatch?.[1] ?? null,
    markdownAlternate: mdAltMatch?.[1] ?? null,
    robots: robotsMatch?.[1] ?? null,
    validJsonLdCount: parsedSchemas.filter(Boolean).length,
    invalidJsonLdCount: parsedSchemas.filter((x) => x === null).length,
  };
}

export async function auditOrigin(origin) {
  const base = origin.replace(/\/+$/, '');
  const htmlRes = await fetch(`${base}/`, { headers: { Accept: 'text/html' } });
  const html = await htmlRes.text();
  const mdRes = await fetch(`${base}/`, { headers: { Accept: 'text/markdown' } });
  const mdText = await mdRes.text();
  const robotsRes = await fetch(`${base}/robots.txt`);
  const robotsTxt = await robotsRes.text();
  const llmsRes = await fetch(`${base}/llms.txt`);
  const mcpRes = await fetch(`${base}/.well-known/mcp.json`);

  const signals = inspectHtmlSignals(html);
  const contentSignal = htmlRes.headers.get('content-signal') ?? '';
  const vary = (htmlRes.headers.get('vary') ?? '').toLowerCase();
  const mdContentType = (mdRes.headers.get('content-type') ?? '').toLowerCase();

  return {
    origin: base,
    httpStatus: htmlRes.status,
    contentSignal,
    varyAccept: vary.includes('accept'),
    markdownNegotiation: mdRes.status === 200 && mdContentType.includes('text/markdown') && mdText.startsWith('---'),
    robotsAllowsAllAi: robotsTxt.includes('Allow: /') && robotsTxt.includes('GPTBot') && robotsTxt.includes('ClaudeBot'),
    llmsTxtStatus: llmsRes.status,
    wellKnownMcpStatus: mcpRes.status,
    ...signals,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.argv[2] || 'https://cairnscale.uk';
  console.log(JSON.stringify(await auditOrigin(target), null, 2));
}
