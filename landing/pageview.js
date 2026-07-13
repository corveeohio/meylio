(function () {
  const API_BASE_URL = 'https://api.meylio.fr';
  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source') || undefined;

  fetch(`${API_BASE_URL}/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: window.location.pathname, source }),
    keepalive: true,
  }).catch(() => {});
})();
