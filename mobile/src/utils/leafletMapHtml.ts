export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  crossed: boolean;
};

export function buildLeafletMapHtml(params: {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  markers: MapMarker[];
}): string {
  const { center, radiusKm, markers } = params;
  const markersJson = JSON.stringify(markers);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #0F0F14; }
  .meylio-marker { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:16px; border:2px solid #2A2A38; background:#1C1C26; font-size:15px; box-shadow:0 2px 6px rgba(0,0,0,0.4); }
  .meylio-marker.crossed { background:#FF5CA8; border-color:#FF5CA8; }
  .meylio-marker.me { background:#7C5CFF; border-color:#7C5CFF; font-size:16px; }
  .meylio-tooltip { background:#1C1C26 !important; color:#fff !important; border:none !important; border-radius:6px !important; font-size:10px !important; font-weight:700 !important; padding:2px 6px !important; box-shadow:none !important; }
  .leaflet-tooltip-top.meylio-tooltip:before { border-top-color:#1C1C26 !important; }
  .leaflet-control-attribution { background: rgba(15,15,20,0.6) !important; color: #9A9AA8 !important; font-size: 9px !important; }
  .leaflet-control-attribution a { color: #C7C7D6 !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  function postToHost(data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    } else if (window.parent) {
      window.parent.postMessage(data, '*');
    }
  }

  function init() {
    var center = [${center.latitude}, ${center.longitude}];
    var map = L.map('map', { zoomControl: false, preferCanvas: true, fadeAnimation: false }).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    var circle = L.circle(center, {
      radius: ${radiusKm} * 1000,
      color: '#7C5CFF',
      weight: 1,
      fillColor: '#7C5CFF',
      fillOpacity: 0.06,
    }).addTo(map);

    map.invalidateSize();
    map.fitBounds(circle.getBounds(), { padding: [24, 24] });

    var meIcon = L.divIcon({ className: '', html: '<div class="meylio-marker me">📍</div>', iconSize: [32, 32] });
    L.marker(center, { icon: meIcon, interactive: false }).addTo(map);

    var markers = ${markersJson};
    markers.forEach(function (m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="meylio-marker' + (m.crossed ? ' crossed' : '') + '">' + (m.crossed ? '🎵' : '●') + '</div>',
        iconSize: [32, 32],
      });
      var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
      marker.bindTooltip(m.score + '%', {
        permanent: true,
        direction: 'top',
        offset: [0, -16],
        className: 'meylio-tooltip',
      });
      marker.on('click', function () {
        postToHost({ type: 'select', userId: m.id });
      });
    });

    window.addEventListener('resize', function () {
      map.invalidateSize();
    });
    setTimeout(function () {
      map.invalidateSize();
    }, 250);
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
</script>
</body>
</html>`;
}
