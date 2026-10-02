import { useEffect } from 'react';

export const SITE_URL = 'https://bislyai.com';

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Per-page SEO for a client-rendered SPA: Google renders JS, so it picks up
// the title, description, canonical and JSON-LD set here. The canonical is
// the important part — index.html deliberately ships WITHOUT one, otherwise
// every route would declare itself a duplicate of the homepage.
export default function useSeo({ title, description, path, image, jsonLd, enabled = true }) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    if (!enabled) return undefined;
    const url = `${SITE_URL}${path || window.location.pathname}`;

    if (title) {
      document.title = title;
      setMeta('property', 'og:title', title);
      setMeta('name', 'twitter:title', title);
    }
    if (description) {
      const desc = description.replace(/\s+/g, ' ').trim().slice(0, 160);
      setMeta('name', 'description', desc);
      setMeta('property', 'og:description', desc);
      setMeta('name', 'twitter:description', desc);
    }
    if (image) {
      setMeta('property', 'og:image', image);
      setMeta('name', 'twitter:image', image);
    }
    setMeta('property', 'og:url', url);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    let ld;
    if (jsonLdText) {
      ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.dataset.seo = 'page';
      ld.text = jsonLdText;
      document.head.appendChild(ld);
    }

    return () => {
      canonical.remove();
      if (ld) ld.remove();
    };
  }, [enabled, title, description, path, image, jsonLdText]);
}
