---
layout: default
title: World Map
permalink: /world-map/
---

<h2><i class="fa fa-globe"></i> Political map (India &amp; China)</h2>
<p>Pan and pinch-zoom. Province names and borders use <a href="https://www.naturalearthdata.com/" rel="noopener">Natural Earth</a> admin-1 (English names). Country outlines: Natural Earth 50m.</p>

<div id="map-controls" aria-label="Map layer controls">
  <label><input type="checkbox" id="toggle-country-borders" checked> Country borders</label>
  <label><input type="checkbox" id="toggle-province-borders" checked> Province borders (India &amp; China)</label>
  <label><input type="checkbox" id="toggle-priority-detail" checked> Province fill (India &amp; China)</label>
  <label><input type="checkbox" id="toggle-city-labels" checked> Major city labels</label>
</div>

<div id="world-map-container" aria-label="Interactive political map"></div>
<p id="map-status" style="font-size: 0.9em; color: #666; margin-top: 10px;"></p>
<p style="font-size: 0.85em; color: #888;">Data: Natural Earth v5 (public domain). Regenerate GeoJSON with <code>node scripts/build-map-data.mjs</code>. Optional PMTiles: see <code>assets/maps/README.md</code>.</p>

<link rel="stylesheet" href="{{ '/assets/vendor/maplibre/maplibre-gl.css' | relative_url }}">
<script src="{{ '/assets/vendor/maplibre/maplibre-gl.js' | relative_url }}"></script>

<style>
  #world-map-container {
    width: 100%;
    height: 72vh;
    min-height: 420px;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-sizing: border-box;
    touch-action: pan-x pan-y pinch-zoom;
  }

  #map-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin: 12px 0 10px;
    font-size: 0.92em;
  }

  #map-controls label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 2px 0;
  }

  #map-controls input[type="checkbox"] {
    margin: 0;
    width: 15px;
    height: 15px;
  }

  body.dark-mode #world-map-container {
    border-color: #444;
  }

  .ml-prov-label {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #111;
    text-shadow: 0 0 2px #fff, 0 0 4px #fff, 0 0 2px #fff;
    pointer-events: none;
    white-space: nowrap;
    line-height: 1.1;
  }

  body.dark-mode .ml-prov-label {
    color: #f2f2f2;
    text-shadow: 0 0 2px #000, 0 0 4px #000, 0 0 2px #000;
  }

  .ml-city-label {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-weight: 600;
    font-size: 11px;
    color: #333;
    text-shadow: 0 0 2px #fff, 0 0 3px #fff;
    pointer-events: none;
    white-space: nowrap;
  }

  body.dark-mode .ml-city-label {
    color: #ddd;
    text-shadow: 0 0 2px #000, 0 0 3px #000;
  }

  @media (max-width: 768px) {
    #world-map-container {
      height: 65vh;
      min-height: 360px;
    }
  }
</style>

<script>
(function () {
  var statusEl = document.getElementById("map-status");
  var container = document.getElementById("world-map-container");
  var toggleCountry = document.getElementById("toggle-country-borders");
  var toggleProvince = document.getElementById("toggle-province-borders");
  var toggleFill = document.getElementById("toggle-priority-detail");
  var toggleCities = document.getElementById("toggle-city-labels");
  var darkToggle = document.getElementById("dark-mode-toggle");

  var urlCountries = "{{ '/assets/geojson/countries-50m.geojson' | relative_url }}";
  var urlAdmin1 = "{{ '/assets/geojson/admin1-china-india.geojson' | relative_url }}";
  var urlCities = "{{ '/assets/geojson/cities-china-india.geojson' | relative_url }}";

  if (!container || typeof maplibregl === "undefined") {
    if (statusEl) statusEl.textContent = "Map could not load (MapLibre GL missing).";
    return;
  }

  function isDark() {
    return document.body && document.body.classList && document.body.classList.contains("dark-mode");
  }

  var dataCountries = null;
  var dataAdmin1 = null;
  var dataCities = null;
  var map = null;
  var provinceMarkers = [];
  var cityMarkers = [];
  var cityRebuildTimer = null;

  function buildStyle() {
    var dark = isDark();
    var adminLine = dark ? "#e85555" : "#a61e1e";
    var adminFill = dark ? "rgba(180, 60, 60, 0.22)" : "rgba(180, 60, 60, 0.12)";
    var countryLine = dark ? "#6cb3ff" : "#2b4c7e";

    return {
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: [
            "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
            "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
            "https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        },
        countries: {
          type: "geojson",
          data: dataCountries
        },
        admin1: {
          type: "geojson",
          data: dataAdmin1
        }
      },
      layers: [
        {
          id: "basemap",
          type: "raster",
          source: "basemap",
          paint: {
            "raster-opacity": 1,
            "raster-brightness-min": dark ? 0.15 : 0,
            "raster-brightness-max": dark ? 0.85 : 1,
            "raster-contrast": dark ? 0.12 : 0
          }
        },
        {
          id: "admin1-fill",
          type: "fill",
          source: "admin1",
          paint: {
            "fill-color": adminFill,
            "fill-outline-color": "transparent"
          }
        },
        {
          id: "country-line",
          type: "line",
          source: "countries",
          paint: {
            "line-color": countryLine,
            "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.6, 4, 1.2, 8, 2],
            "line-opacity": 0.85
          }
        },
        {
          id: "admin1-line",
          type: "line",
          source: "admin1",
          paint: {
            "line-color": adminLine,
            "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 6, 1.8, 10, 2.6],
            "line-opacity": 0.95
          }
        }
      ]
    };
  }

  function applyThemePaint() {
    if (!map || !map.isStyleLoaded()) return;
    var dark = isDark();
    if (map.getLayer("basemap")) {
      map.setPaintProperty("basemap", "raster-brightness-min", dark ? 0.15 : 0);
      map.setPaintProperty("basemap", "raster-brightness-max", dark ? 0.85 : 1);
      map.setPaintProperty("basemap", "raster-contrast", dark ? 0.12 : 0);
    }
    if (map.getLayer("admin1-fill")) {
      map.setPaintProperty("admin1-fill", "fill-color", dark ? "rgba(180, 60, 60, 0.22)" : "rgba(180, 60, 60, 0.12)");
    }
    if (map.getLayer("admin1-line")) {
      map.setPaintProperty("admin1-line", "line-color", dark ? "#e85555" : "#a61e1e");
    }
    if (map.getLayer("country-line")) {
      map.setPaintProperty("country-line", "line-color", dark ? "#6cb3ff" : "#2b4c7e");
    }
  }

  function provinceName(props) {
    if (!props) return "";
    return String(props.name_en || props.NAME || props.name || "").trim();
  }

  function clearProvinceMarkers() {
    provinceMarkers.forEach(function (m) {
      m.remove();
    });
    provinceMarkers = [];
  }

  function clearCityMarkers() {
    cityMarkers.forEach(function (m) {
      m.remove();
    });
    cityMarkers = [];
  }

  function syncProvinceLabelSize() {
    if (!map) return;
    var z = map.getZoom();
    var px = Math.max(9, Math.min(17, 6.5 + z * 0.9));
    provinceMarkers.forEach(function (m) {
      var el = m.getElement();
      if (el) el.style.fontSize = px + "px";
    });
  }

  function buildProvinceMarkers() {
    clearProvinceMarkers();
    if (!map || !dataAdmin1) return;
    dataAdmin1.features.forEach(function (f) {
      var name = provinceName(f.properties);
      if (!name) return;
      var lng = f.properties.label_lng;
      var lat = f.properties.label_lat;
      if (typeof lng !== "number" || typeof lat !== "number") return;
      var el = document.createElement("div");
      el.className = "ml-prov-label";
      el.textContent = name.toUpperCase();
      var marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
      provinceMarkers.push(marker);
    });
    syncProvinceLabelSize();
  }

  function boundsContains(bounds, lng, lat) {
    var north = bounds.getNorth();
    var south = bounds.getSouth();
    var east = bounds.getEast();
    var west = bounds.getWest();
    if (lat > north || lat < south) return false;
    if (west <= east) {
      return lng >= west && lng <= east;
    }
    return lng >= west || lng <= east;
  }

  function pickCityFeatures() {
    if (!dataCities || !map) return [];
    var z = map.getZoom();
    if (z < 5) return [];
    var b = map.getBounds();
    var list = [];
    dataCities.features.forEach(function (f) {
      if (!f.geometry || f.geometry.type !== "Point") return;
      var c = f.geometry.coordinates;
      if (!boundsContains(b, c[0], c[1])) return;
      var pop = Number(f.properties.POP_MAX || f.properties.pop_max || 0);
      list.push({ f: f, pop: pop });
    });
    list.sort(function (a, b2) {
      return b2.pop - a.pop;
    });
    var cap = z > 7 ? 130 : 75;
    return list.slice(0, cap).map(function (x) {
      return x.f;
    });
  }

  function rebuildCityMarkers() {
    clearCityMarkers();
    if (!map || !dataCities) return;
    if (!toggleCities || !toggleCities.checked) return;
    pickCityFeatures().forEach(function (f) {
      var c = f.geometry.coordinates;
      var name = String(f.properties.NAME || f.properties.name || "").trim();
      if (!name) return;
      var el = document.createElement("div");
      el.className = "ml-city-label";
      el.textContent = name;
      var marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(c).addTo(map);
      cityMarkers.push(marker);
    });
  }

  function scheduleCityRebuild() {
    if (cityRebuildTimer) clearTimeout(cityRebuildTimer);
    cityRebuildTimer = setTimeout(function () {
      cityRebuildTimer = null;
      rebuildCityMarkers();
    }, 160);
  }

  function rebuildAllMarkers() {
    buildProvinceMarkers();
    rebuildCityMarkers();
  }

  function setLayerVisibility(id, on) {
    var vis = on ? "visible" : "none";
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", vis);
    }
  }

  function applyUiToggles() {
    var c = toggleCountry && toggleCountry.checked;
    var p = toggleProvince && toggleProvince.checked;
    var f = toggleFill && toggleFill.checked;
    var z = toggleCities && toggleCities.checked;
    setLayerVisibility("country-line", c);
    setLayerVisibility("admin1-line", p);
    setLayerVisibility("admin1-fill", f);
    provinceMarkers.forEach(function (m) {
      var el = m.getElement();
      if (el) el.style.display = p ? "" : "none";
    });
    if (z) {
      rebuildCityMarkers();
    } else {
      clearCityMarkers();
    }
  }

  Promise.all([
    fetch(urlCountries).then(function (r) {
      return r.json();
    }),
    fetch(urlAdmin1).then(function (r) {
      return r.json();
    }),
    fetch(urlCities).then(function (r) {
      return r.json();
    })
  ])
    .then(function (all) {
      dataCountries = all[0];
      dataAdmin1 = all[1];
      dataCities = all[2];

      map = new maplibregl.Map({
        container: container,
        style: buildStyle(),
        center: [95, 28],
        zoom: 3.6,
        minZoom: 2,
        maxZoom: 10,
        renderWorldCopies: true,
        attributionControl: true
      });

      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      map.on("load", function () {
        if (statusEl) statusEl.textContent = "";
        applyThemePaint();
        applyUiToggles();
        rebuildAllMarkers();
      });

      map.on("zoom", function () {
        syncProvinceLabelSize();
        scheduleCityRebuild();
      });

      map.on("moveend", scheduleCityRebuild);

      map.on("error", function (e) {
        if (statusEl && e && e.error) {
          statusEl.textContent = "Map error: " + (e.error.message || String(e.error));
        }
      });

      ["toggle-country-borders", "toggle-province-borders", "toggle-priority-detail", "toggle-city-labels"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.addEventListener("change", function () {
            applyUiToggles();
          });
        }
      });

      if (darkToggle) {
        darkToggle.addEventListener("click", function () {
          setTimeout(function () {
            applyThemePaint();
          }, 0);
        });
      }
    })
    .catch(function (err) {
      if (statusEl) {
        statusEl.textContent = "Could not load map data: " + (err && err.message ? err.message : String(err));
      }
    });
})();
</script>
