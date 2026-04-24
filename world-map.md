---
layout: default
title: World Map
permalink: /world-map/
---

<h2><i class="fa fa-globe"></i> Interactive World Map</h2>
<p>Pinch to zoom on touch screens, drag to pan, and zoom in to reveal provinces and major cities.</p>

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

  body.dark-mode .city-label {
    background: rgba(30, 30, 30, 0.85);
    border-color: #555;
    color: #f5f5f5;
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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 10,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var countryLayer = null;
    var provinceLayer = null;
    var priorityProvinceLayer = null;
    var cityLayer = L.layerGroup().addTo(map);
    var provinceData = null;
    var extraProvinceData = [];
    var cityData = null;

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
        fillOpacity: 0
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

    function rebuildCityLayer() {
      if (!cityData || !cityData.features) {
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

        if (isPriorityCountry) {
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

      var priorityFeatures = [];
      if (provinceData.features) {
        for (var i = 0; i < provinceData.features.length; i++) {
          if (isChinaOrIndiaFeature(provinceData.features[i])) {
            priorityFeatures.push(provinceData.features[i]);
          }
        }
      }

      for (var j = 0; j < extraProvinceData.length; j++) {
        var extraSet = extraProvinceData[j];
        if (!extraSet || !extraSet.features) {
          continue;
        }
        for (var k = 0; k < extraSet.features.length; k++) {
          if (isChinaOrIndiaFeature(extraSet.features[k])) {
            priorityFeatures.push(extraSet.features[k]);
          }
        }
      }

      priorityProvinceLayer = L.geoJSON({
        type: "FeatureCollection",
        features: priorityFeatures
      }, {
        style: stylePriorityProvinceBorders
      });
    }

    function syncZoomLayers() {
      var zoom = map.getZoom();
      ensureProvinceLayer();
      ensurePriorityProvinceLayer();

      if (zoom >= 4 && priorityProvinceLayer && !map.hasLayer(priorityProvinceLayer)) {
        map.addLayer(priorityProvinceLayer);
      } else if (zoom < 4 && priorityProvinceLayer && map.hasLayer(priorityProvinceLayer)) {
        map.removeLayer(priorityProvinceLayer);
      }

      if (zoom >= 5 && provinceLayer && !map.hasLayer(provinceLayer)) {
        map.addLayer(provinceLayer);
      } else if (zoom < 5 && provinceLayer && map.hasLayer(provinceLayer)) {
        map.removeLayer(provinceLayer);
      }

      rebuildCityLayer();
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
      setStatus("Zoom 4+ shows extra province detail for China and India. Zoom 5+ adds global provinces.");
    }).catch(function () {
      setStatus("Map data could not be loaded. Please check your internet connection and refresh.");
    });

    map.on("zoomend moveend", syncZoomLayers);
  })();
</script>
