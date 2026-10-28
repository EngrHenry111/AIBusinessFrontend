import toast from 'react-hot-toast';
import api from './api';

// Private uploads (receipts, meeting attachments…) are stored behind
// Cloudinary's authenticated delivery: the saved URL opens nothing by
// itself. Ask the API for a link that works for a few minutes instead.
const PRIVATE_FILE_RE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/authenticated\//;

export function openFile(url) {
  if (!PRIVATE_FILE_RE.test(url || '')) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  // Opened now, while the click still counts, so popup blockers allow it.
  const tab = window.open('', '_blank');
  api.get('/files/link', { params: { u: url } })
    .then(({ data }) => {
      if (tab) { tab.opener = null; tab.location.href = data.url; } else window.location.href = data.url;
    })
    .catch((err) => {
      tab?.close();
      toast.error(err.response?.data?.message || 'Could not open this file');
    });
}
