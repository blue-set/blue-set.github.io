---
layout: default
title: World Map
permalink: /world-map/
---

<h2><i class="fa fa-globe"></i> Interactive World Map</h2>
<p>Pinch to zoom on touch screens, drag to pan, and zoom in to reveal provinces and major cities.</p>

<div id="map-controls" aria-label="Map layer controls">
  <label><input type="checkbox" id="toggle-country-borders" checked> Country borders</label>
  <label><input type="checkbox" id="toggle-province-borders" checked> Province/state borders</label>
  <label><input type="checkbox" id="toggle-priority-detail" checked> Extra detail for China/India</label>
  <label><input type="checkbox" id="toggle-city-labels" checked> Major city labels</label>
</div>

<div id="world-map-container" aria-label="Interactive world map"></div>
<p id="map-status" style="font-size: 0.9em; color: #666; margin-top: 10px;"></p>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""
>
<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
  crossorigin=""
></script>

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

  .city-label {
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid #999;
    border-radius: 3px;
    color: #111;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
    padding: 1px 4px;
    white-space: nowrap;
  }

  .province-label {
    display: block;
    box-sizing: border-box;
    line-height: 1.1;
  }

  .province-label__inner {
    display: inline-block;
    max-width: 10em;
    overflow: hidden;
    text-overflow: ellipsis;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(80, 80, 80, 0.45);
    border-radius: 3px;
    color: #111;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.35px;
    line-height: 1.15;
    padding: 3px 6px;
    text-transform: uppercase;
    text-shadow: 0 0 1px #fff, 0 0 2px #fff, 0 0 1px #fff;
    white-space: nowrap;
  }

  body.dark-mode .city-label {
    background: rgba(30, 30, 30, 0.85);
    border-color: #555;
    color: #f5f5f5;
  }

  body.dark-mode .province-label__inner {
    background: rgba(25, 25, 25, 0.9);
    border-color: rgba(220, 220, 220, 0.25);
    color: #f2f2f2;
    text-shadow: 0 0 1px #000, 0 0 2px #000, 0 0 1px #000;
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
    var mapEl = document.getElementById("world-map-container");
    var toggleCountryBordersEl = document.getElementById("toggle-country-borders");
    var toggleProvinceBordersEl = document.getElementById("toggle-province-borders");
    var togglePriorityDetailEl = document.getElementById("toggle-priority-detail");
    var toggleCityLabelsEl = document.getElementById("toggle-city-labels");

    if (!window.L || !mapEl) {
      if (statusEl) {
        statusEl.textContent = "Map failed to initialize.";
      }
      return;
    }

    var map = L.map("world-map-container", {
      worldCopyJump: true,
      zoomControl: true,
      zoomSnap: 0.5,
      minZoom: 2,
      maxZoom: 10,
      tap: true
    }).setView([20, 10], 2.5);

    map.attributionControl.setPrefix(false);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 10,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    var countryLayer = null;
    var provinceLayer = null;
    var priorityProvinceLayer = null;
    var priorityProvinceLabelLayer = L.layerGroup();
    var cityLayer = L.layerGroup().addTo(map);
    var provinceData = null;
    var extraProvinceData = [];
    var cityData = null;
    var uiState = {
      showCountryBorders: true,
      showProvinceBorders: true,
      showPriorityDetail: true,
      showCityLabels: true
    };

    function setStatus(message) {
      if (statusEl) {
        statusEl.textContent = message;
      }
    }

    function inView(bounds, lat, lng) {
      return bounds.contains([lat, lng]);
    }

    function styleCountryBorders() {
      return {
        color: "#2b4c7e",
        weight: 1.1,
        opacity: 0.8,
        fillOpacity: 0
      };
    }

    function styleProvinceBorders() {
      return {
        color: "#8a2d2d",
        weight: 0.8,
        opacity: 0.75,
        fillOpacity: 0
      };
    }

    function stylePriorityProvinceBorders() {
      return {
        color: "#b30000",
        weight: 1.3,
        opacity: 0.9,
        fillColor: "#d95f5f",
        fillOpacity: 0.08
      };
    }

    function propText(props, keys) {
      for (var i = 0; i < keys.length; i++) {
        var value = props[keys[i]];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
      return "";
    }

    function isChinaOrIndiaName(text) {
      var value = String(text || "").toLowerCase();
      return value.indexOf("china") !== -1 || value.indexOf("india") !== -1;
    }

    function isChinaOrIndiaCode(text) {
      var value = String(text || "").toUpperCase();
      return value === "CHN" || value === "IND" || value === "CN" || value === "IN";
    }

    function isChinaOrIndiaFeature(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      if (isChinaOrIndiaCode(props.adm0_a3) || isChinaOrIndiaCode(props.iso_a2) || isChinaOrIndiaCode(props.ISO_A2) || isChinaOrIndiaCode(props.ISO_A3)) {
        return true;
      }
      if (isChinaOrIndiaName(props.admin) || isChinaOrIndiaName(props.adm0_name) || isChinaOrIndiaName(props.geonunit) || isChinaOrIndiaName(props.country)) {
        return true;
      }
      return false;
    }

    function cityName(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return props.NAME || props.name || props.NAMEASCII || props.nameascii || null;
    }

    function cityPopulation(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return Number(props.POP_MAX || props.pop_max || props.population || 0);
    }

    function cityScaleRank(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      var rank = Number(props.SCALERANK || props.scalerank);
      return Number.isFinite(rank) ? rank : 99;
    }

    function cityCountryName(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return propText(props, ["ADM0NAME", "adm0name", "SOV0NAME", "sov0name", "COUNTRY", "country", "admin"]);
    }

    function cityCountryCode(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return propText(props, ["ADM0_A3", "adm0_a3", "ISO_A2", "iso_a2", "ISO_A3", "iso_a3"]);
    }

    function provinceName(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      return propText(props, [
        "name_en",
        "NAME_EN",
        "name",
        "NAME",
        "nameascii",
        "NAMEASCII",
        "woe_name",
        "gn_name"
      ]);
    }

    function provinceLabelTypography(zoom) {
      var t = 13;
      if (zoom >= 8) {
        t = 18;
      } else if (zoom >= 7) {
        t = 16.5;
      } else if (zoom >= 6) {
        t = 15;
      } else {
        t = 13;
      }
      return {
        fontSize: t,
        paddingX: Math.round(4 + (t - 13) * 0.4),
        paddingY: Math.round(3 + (t - 13) * 0.3)
      };
    }

    function createProvinceLabelIcon(text, zoom) {
      var typo = provinceLabelTypography(zoom);
      var safeText = String(text);
      // Escape a few common HTML-unsafe characters in administrative names.
      safeText = safeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      var html = "<span class=\"province-label__inner\" style=\"font-size:" + typo.fontSize + "px;" +
        " padding:" + typo.paddingY + "px " + typo.paddingX + "px;\">" + safeText + "</span>";
      // Leaflet's divIcon needs a generous box so the larger text doesn't get clipped.
      return L.divIcon({
        className: "province-label",
        html: html,
        iconSize: [300, 80],
        iconAnchor: [150, 40]
      });
    }

    function updateProvinceLabelIcons() {
      if (!priorityProvinceLabelLayer) {
        return;
      }
      var zoom = map.getZoom();
      var layers = priorityProvinceLabelLayer.getLayers();
      for (var i = 0; i < layers.length; i++) {
        var m = layers[i];
        if (!m || !m.setIcon || !m._provinceLabelText) {
          continue;
        }
        m.setIcon(createProvinceLabelIcon(m._provinceLabelText, zoom));
      }
    }

    function ringCentroid(ring) {
      if (!ring || ring.length < 3) {
        return null;
      }
      var areaAcc = 0;
      var cxAcc = 0;
      var cyAcc = 0;
      for (var i = 0; i < ring.length - 1; i++) {
        var x1 = ring[i][0];
        var y1 = ring[i][1];
        var x2 = ring[i + 1][0];
        var y2 = ring[i + 1][1];
        var cross = (x1 * y2) - (x2 * y1);
        areaAcc += cross;
        cxAcc += (x1 + x2) * cross;
        cyAcc += (y1 + y2) * cross;
      }
      var area = areaAcc / 2;
      if (!area) {
        return null;
      }
      return [cxAcc / (6 * area), cyAcc / (6 * area)];
    }

    function closedRing(ring) {
      if (!ring || !ring.length) {
        return ring;
      }
      var first = ring[0];
      var last = ring[ring.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        return ring;
      }
      return ring.concat([first]);
    }

    // Ray casting test for a simple ring. Works for most GeoJSON-style rings.
    function pointInRing(lng, lat, ring) {
      var r = closedRing(ring);
      var inside = false;
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
        var xi = r[i][0];
        var yi = r[i][1];
        var xj = r[j][0];
        var yj = r[j][1];
        var intersect = ((yi > lat) !== (yj > lat)) &&
          (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
        if (intersect) {
          inside = !inside;
        }
      }
      return inside;
    }

    function ringAbsArea(ring) {
      if (!ring || ring.length < 3) {
        return 0;
      }
      var areaAcc = 0;
      for (var i = 0; i < ring.length - 1; i++) {
        var x1 = ring[i][0];
        var y1 = ring[i][1];
        var x2 = ring[i + 1][0];
        var y2 = ring[i + 1][1];
        areaAcc += (x1 * y2) - (x2 * y1);
      }
      return Math.abs(areaAcc / 2);
    }

    function pickLargestPolygon(geometry) {
      if (geometry && geometry.type === "Polygon" && geometry.coordinates && geometry.coordinates[0]) {
        return geometry.coordinates;
      }
      if (geometry && geometry.type === "MultiPolygon" && geometry.coordinates) {
        var best = null;
        var bestArea = 0;
        for (var i = 0; i < geometry.coordinates.length; i++) {
          var poly = geometry.coordinates[i];
          if (!poly || !poly[0]) {
            continue;
          }
          var outer = poly[0];
          var a = ringAbsArea(outer);
          if (a > bestArea) {
            bestArea = a;
            best = poly;
          }
        }
        return best;
      }
      return null;
    }

    function pointInPolygonRings(lng, lat, polygon) {
      if (!polygon || !polygon[0]) {
        return false;
      }
      var outer = polygon[0];
      if (!pointInRing(lng, lat, outer)) {
        return false;
      }
      for (var h = 1; h < polygon.length; h++) {
        if (pointInRing(lng, lat, polygon[h])) {
          return false;
        }
      }
      return true;
    }

    // Find a point that is *inside* the primary polygon, not just its centroid
    // (centroids are often outside C-shaped and island-heavy administrative shapes).
    function labelPointForPolygon(polygon) {
      if (!polygon || !polygon[0]) {
        return null;
      }
      var outer = polygon[0];
      var c = ringCentroid(outer);
      if (c && pointInPolygonRings(c[0], c[1], polygon)) {
        return c;
      }

      var b = L.latLngBounds(outer);
      if (!b.isValid()) {
        return null;
      }
      var sw = b.getSouthWest();
      var ne = b.getNorthEast();
      var best = null;
      var bestScore = -Infinity;
      var steps = 12;
      for (var xi = 0; xi <= steps; xi++) {
        for (var yi = 0; yi <= steps; yi++) {
          var lng = sw.lng + (ne.lng - sw.lng) * (xi / steps);
          var lat = sw.lat + (ne.lat - sw.lat) * (yi / steps);
          if (pointInPolygonRings(lng, lat, polygon)) {
            // Maximize distance to bbox edges; cheap proxy for a more interior point.
            var dLng = Math.min(lng - sw.lng, ne.lng - lng);
            var dLat = Math.min(lat - sw.lat, ne.lat - lat);
            var score = Math.min(dLng, dLat);
            if (score > bestScore) {
              bestScore = score;
              best = [lng, lat];
            }
          }
        }
      }
      return best;
    }

    function labelPointForGeometry(geometry) {
      if (!geometry || !geometry.type) {
        return null;
      }
      if (geometry.type === "Point") {
        return geometry.coordinates;
      }
      if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
        var poly = pickLargestPolygon(geometry);
        if (!poly) {
          return null;
        }
        return labelPointForPolygon(poly);
      }
      return null;
    }

    function featureDedupKey(feature) {
      var props = feature && feature.properties ? feature.properties : {};
      var code = propText(props, ["adm1_code", "ADM1_CODE", "gadm1_code", "code_hasc", "iso_3166_2", "postal", "id"]);
      var name = propText(props, [
        "name_en",
        "NAME_EN",
        "name",
        "NAME",
        "nameascii",
        "NAMEASCII"
      ]).toLowerCase();
      var a3 = String(propText(props, ["adm0_a3", "ADM0_A3", "gu_a3", "GU_A3"]) || "").toUpperCase();
      if (a3 && name) {
        return a3 + "|" + name;
      }
      if (a3 && code) {
        return a3 + "|" + code;
      }
      if (name) {
        return "name|" + name;
      }
      if (code) {
        return "code|" + code;
      }
      return null;
    }

    function rebuildCityLayer() {
      if (!cityData || !cityData.features) {
        return;
      }
      if (!uiState.showCityLabels) {
        cityLayer.clearLayers();
        return;
      }

      var zoom = map.getZoom();
      var bounds = map.getBounds().pad(0.2);
      cityLayer.clearLayers();

      var maxRank;
      var minPopulation;

      if (zoom >= 7) {
        maxRank = 9;
        minPopulation = 150000;
      } else if (zoom >= 5) {
        maxRank = 5;
        minPopulation = 800000;
      } else if (zoom >= 3) {
        maxRank = 2;
        minPopulation = 3000000;
      } else {
        maxRank = 1;
        minPopulation = 10000000;
      }

      for (var i = 0; i < cityData.features.length; i++) {
        var feature = cityData.features[i];
        if (!feature || !feature.geometry || feature.geometry.type !== "Point") {
          continue;
        }
        var coords = feature.geometry.coordinates;
        var lng = coords[0];
        var lat = coords[1];
        if (!inView(bounds, lat, lng)) {
          continue;
        }

        var rank = cityScaleRank(feature);
        var pop = cityPopulation(feature);
        var countryName = cityCountryName(feature);
        var countryCode = cityCountryCode(feature);
        var isPriorityCountry = isChinaOrIndiaName(countryName) || isChinaOrIndiaCode(countryCode);

        if (uiState.showPriorityDetail && isPriorityCountry) {
          // Show more labels for China/India to provide richer local detail.
          if (zoom >= 6) {
            maxRank = Math.max(maxRank, 10);
            minPopulation = Math.min(minPopulation, 100000);
          } else if (zoom >= 4) {
            maxRank = Math.max(maxRank, 7);
            minPopulation = Math.min(minPopulation, 400000);
          } else if (zoom >= 3) {
            maxRank = Math.max(maxRank, 4);
            minPopulation = Math.min(minPopulation, 1200000);
          }
        }

        if (rank > maxRank && pop < minPopulation) {
          continue;
        }

        var name = cityName(feature);
        if (!name) {
          continue;
        }

        var marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "city-label",
            html: name
          }),
          keyboard: false
        });
        cityLayer.addLayer(marker);
      }
    }

    function ensureProvinceLayer() {
      if (!provinceData || provinceLayer) {
        return;
      }

      provinceLayer = L.geoJSON(provinceData, {
        style: styleProvinceBorders
      });
    }

    function ensurePriorityProvinceLayer() {
      if (!provinceData || priorityProvinceLayer) {
        return;
      }

      var seenKeys = Object.create(null);
      var priorityFeatures = [];

      function addFeatureIfNew(feature) {
        if (!feature) {
          return;
        }
        var key = featureDedupKey(feature);
        if (key) {
          if (seenKeys[key]) {
            return;
          }
          seenKeys[key] = true;
        }
        priorityFeatures.push(feature);
      }

      for (var j = 0; j < extraProvinceData.length; j++) {
        var extraSet = extraProvinceData[j];
        if (!extraSet || !extraSet.features) {
          continue;
        }
        for (var k = 0; k < extraSet.features.length; k++) {
          var f = extraSet.features[k];
          if (isChinaOrIndiaFeature(f)) {
            addFeatureIfNew(f);
          }
        }
      }

      if (provinceData.features) {
        for (var i = 0; i < provinceData.features.length; i++) {
          var nf = provinceData.features[i];
          if (isChinaOrIndiaFeature(nf)) {
            addFeatureIfNew(nf);
          }
        }
      }

      priorityProvinceLayer = L.geoJSON({
        type: "FeatureCollection",
        features: priorityFeatures
      }, {
        style: stylePriorityProvinceBorders
      });

      priorityProvinceLabelLayer.clearLayers();
      for (var m = 0; m < priorityFeatures.length; m++) {
        var feature = priorityFeatures[m];
        var label = provinceName(feature);
        if (!label) {
          continue;
        }
        var pt = labelPointForGeometry(feature.geometry);
        if (!pt) {
          continue;
        }
        var marker = L.marker([pt[1], pt[0]], {
          icon: createProvinceLabelIcon(label, map.getZoom()),
          keyboard: false
        });
        marker._provinceLabelText = label;
        marker.setZIndexOffset(500);
        priorityProvinceLabelLayer.addLayer(marker);
      }
    }

    function syncZoomLayers() {
      var zoom = map.getZoom();
      ensureProvinceLayer();
      ensurePriorityProvinceLayer();

      if (uiState.showCountryBorders && countryLayer && !map.hasLayer(countryLayer)) {
        map.addLayer(countryLayer);
      } else if (!uiState.showCountryBorders && countryLayer && map.hasLayer(countryLayer)) {
        map.removeLayer(countryLayer);
      }

      if (uiState.showPriorityDetail && zoom >= 4 && priorityProvinceLayer && !map.hasLayer(priorityProvinceLayer)) {
        map.addLayer(priorityProvinceLayer);
      } else if ((!uiState.showPriorityDetail || zoom < 4) && priorityProvinceLayer && map.hasLayer(priorityProvinceLayer)) {
        map.removeLayer(priorityProvinceLayer);
      }

      if (uiState.showPriorityDetail && zoom >= 5 && !map.hasLayer(priorityProvinceLabelLayer)) {
        map.addLayer(priorityProvinceLabelLayer);
        updateProvinceLabelIcons();
      } else if ((!uiState.showPriorityDetail || zoom < 5) && map.hasLayer(priorityProvinceLabelLayer)) {
        map.removeLayer(priorityProvinceLabelLayer);
      } else {
        updateProvinceLabelIcons();
      }

      if (uiState.showProvinceBorders && zoom >= 5 && provinceLayer && !map.hasLayer(provinceLayer)) {
        map.addLayer(provinceLayer);
      } else if ((!uiState.showProvinceBorders || zoom < 5) && provinceLayer && map.hasLayer(provinceLayer)) {
        map.removeLayer(provinceLayer);
      }

      rebuildCityLayer();
    }

    function bindControlEvents() {
      if (toggleCountryBordersEl) {
        toggleCountryBordersEl.addEventListener("change", function () {
          uiState.showCountryBorders = !!toggleCountryBordersEl.checked;
          syncZoomLayers();
        });
      }
      if (toggleProvinceBordersEl) {
        toggleProvinceBordersEl.addEventListener("change", function () {
          uiState.showProvinceBorders = !!toggleProvinceBordersEl.checked;
          syncZoomLayers();
        });
      }
      if (togglePriorityDetailEl) {
        togglePriorityDetailEl.addEventListener("change", function () {
          uiState.showPriorityDetail = !!togglePriorityDetailEl.checked;
          syncZoomLayers();
        });
      }
      if (toggleCityLabelsEl) {
        toggleCityLabelsEl.addEventListener("change", function () {
          uiState.showCityLabels = !!toggleCityLabelsEl.checked;
          syncZoomLayers();
        });
      }
    }

    Promise.all([
      fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson").then(function (res) { return res.json(); }),
      fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson").then(function (res) { return res.json(); }),
      fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson").then(function (res) { return res.json(); })
    ]).then(function (results) {
      var countriesData = results[0];
      provinceData = results[1];
      cityData = results[2];

      countryLayer = L.geoJSON(countriesData, {
        style: styleCountryBorders
      }).addTo(map);

      return Promise.allSettled([
        fetch("https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson").then(function (res) { return res.json(); }),
        fetch("https://raw.githubusercontent.com/longwosion/geojson-map-china/master/china.json").then(function (res) { return res.json(); })
      ]);
    }).then(function (extraResults) {
      for (var i = 0; i < extraResults.length; i++) {
        if (extraResults[i].status === "fulfilled" && extraResults[i].value && extraResults[i].value.type) {
          extraProvinceData.push(extraResults[i].value);
        }
      }

      syncZoomLayers();
      bindControlEvents();
      setStatus("Zoom 4+ shows extra province detail for China and India. Zoom 5+ adds global provinces.");
    }).catch(function () {
      setStatus("Map data could not be loaded. Please check your internet connection and refresh.");
    });

    map.on("zoomend moveend", syncZoomLayers);
  })();
</script>
