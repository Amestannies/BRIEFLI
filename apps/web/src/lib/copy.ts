/**
 * Copies text to clipboard reliably on both HTTP and HTTPS.
 * Tries the modern Clipboard API first, falls back to a
 * temporary off-screen textarea + execCommand approach.
 */
export function copyToClipboard(text: string): void {
  if (typeof window === 'undefined') return;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => forceCopy(text));
  } else {
    forceCopy(text);
  }
}

function forceCopy(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText =
    'position:fixed;top:0;left:0;width:2em;height:2em;' +
    'padding:0;border:none;outline:none;box-shadow:none;' +
    'background:transparent;opacity:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    // nothing more we can do
  }
  document.body.removeChild(ta);
}
