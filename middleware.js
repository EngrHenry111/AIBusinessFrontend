// Vercel Routing Middleware — runs at the edge before vercel.json rewrites.
//
// The SPA's index.html is the same generic BizlyAI page for every URL, and
// useSeo() only fixes the <head> after JavaScript runs. Google eventually
// renders JS, but WhatsApp/Facebook/X link previews and Google's first
// crawl pass read the raw HTML only — so a shared store link previewed as
// "BizlyAI" instead of the store. Here each store and product page gets its
// own title, description, image, canonical, JSON-LD and web-app manifest
// baked into the HTML before it leaves the edge.
//
// Fail-open: if the API is slow (Render cold start) or the store doesn't
// exist, the request falls through to the plain SPA exactly as before.

export const config = {
  matcher: ['/store/:slug', '/store/:slug/', '/store/:slug/product/:id', '/store/:slug/product/:id/'],
};

const META_TIMEOUT_MS = 3500;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Replace the first tag matching `re`, or append before </head> if absent.
function upsert(html, re, tag) {
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

const metaRe = (attr, key) => new RegExp(`<meta\\s+${attr}="${key.replace(/[:.]/g, '\\$&')}"[^>]*>`, 'i');

function inject(html, m) {
  const set = (attr, key, value) => {
    html = upsert(html, metaRe(attr, key), `<meta ${attr}="${key}" content="${esc(value)}" />`);
  };

  html = upsert(html, /<title>[\s\S]*?<\/title>/i, `<title>${esc(m.title)}</title>`);
  set('name', 'description', m.description);
  set('property', 'og:type', m.ogType || 'website');
  set('property', 'og:title', m.title);
  set('property', 'og:description', m.description);
  set('property', 'og:url', m.canonical);
  set('property', 'og:site_name', m.siteName);
  set('name', 'twitter:title', m.title);
  set('name', 'twitter:description', m.description);
  if (m.image) {
    set('property', 'og:image', m.image);
    set('name', 'twitter:image', m.image);
    // The generic image's 1200x630 dimensions don't apply to a store photo.
    html = html.replace(metaRe('property', 'og:image:width'), '').replace(metaRe('property', 'og:image:height'), '');
  }
  set('name', 'theme-color', m.themeColor);
  set('name', 'apple-mobile-web-app-title', m.appName);

  html = upsert(html, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${esc(m.canonical)}" />`);
  html = upsert(html, /<link\s+rel="manifest"[^>]*>/i, `<link rel="manifest" href="${esc(m.manifest)}" />`);
  html = upsert(html, /<link\s+rel="apple-touch-icon"[^>]*>/i, `<link rel="apple-touch-icon" href="${esc(m.appleIcon)}" />`);

  if (m.jsonLd) {
    // < stops a "</script>" inside product text from closing the tag.
    const ld = JSON.stringify(m.jsonLd).replace(/</g, '\\u003c');
    html = html.replace('</head>', `    <script type="application/ld+json" data-seo="ssr">${ld}</script>\n  </head>`);
  }
  return html;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const apiOrigin = (process.env.SEO_API_ORIGIN || url.origin).replace(/\/+$/, '');

  try {
    const [metaRes, shellRes] = await Promise.all([
      fetch(`${apiOrigin}/api/v1/seo/page-meta?path=${encodeURIComponent(url.pathname)}`, {
        signal: AbortSignal.timeout(META_TIMEOUT_MS),
        headers: { accept: 'application/json' },
      }),
      fetch(new URL('/index.html', url.origin)),
    ]);
    if (!metaRes.ok || !shellRes.ok) return undefined;

    const { data } = await metaRes.json();
    if (!data?.title) return undefined;

    return new Response(inject(await shellRes.text(), data), {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return undefined; // timeout / network error → serve the normal SPA
  }
}
