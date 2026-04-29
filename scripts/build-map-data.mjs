/**
 * Downloads Natural Earth GeoJSON, builds India+China admin-1 and major cities
 * GeoJSON for the static MapLibre world map. Run: node scripts/build-map-data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "geojson");

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function closedRing(ring) {
  if (!ring?.length) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) return ring;
  return ring.concat([a]);
}

function pointInRing(lng, lat, ring) {
  const r = closedRing(ring);
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0];
    const yi = r[i][1];
    const xj = r[j][0];
    const yj = r[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(lng, lat, polygon) {
  if (!polygon?.[0]) return false;
  const outer = polygon[0];
  if (!pointInRing(lng, lat, outer)) return false;
  for (let h = 1; h < polygon.length; h++) {
    if (pointInRing(lng, lat, polygon[h])) return false;
  }
  return true;
}

function ringCentroid(ring) {
  if (!ring || ring.length < 3) return null;
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0];
    const y1 = ring[i][1];
    const x2 = ring[i + 1][0];
    const y2 = ring[i + 1][1];
    const c = x1 * y2 - x2 * y1;
    a += c;
    cx += (x1 + x2) * c;
    cy += (y1 + y2) * c;
  }
  a *= 0.5;
  if (!a) return null;
  return [cx / (6 * a), cy / (6 * a)];
}

function pickLargestPolygon(geometry) {
  if (geometry?.type === "Polygon") return geometry.coordinates;
  if (geometry?.type === "MultiPolygon" && geometry.coordinates) {
    let best = null;
    let bestA = 0;
    for (const poly of geometry.coordinates) {
      if (!poly?.[0]) continue;
      const outer = poly[0];
      let a = 0;
      const r = closedRing(outer);
      for (let i = 0; i < r.length - 1; i++) {
        a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
      }
      a = Math.abs(a / 2);
      if (a > bestA) {
        bestA = a;
        best = poly;
      }
    }
    return best;
  }
  return null;
}

function labelPointForPolygon(poly) {
  if (!poly?.[0]) return null;
  const outer = poly[0];
  const c = ringCentroid(outer);
  if (c && pointInPolygonRings(c[0], c[1], poly)) return c;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of outer) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  let best = null;
  let bestScore = -Infinity;
  const steps = 14;
  for (let xi = 0; xi <= steps; xi++) {
    for (let yi = 0; yi <= steps; yi++) {
      const lng = minLng + ((maxLng - minLng) * xi) / steps;
      const lat = minLat + ((maxLat - minLat) * yi) / steps;
      if (pointInPolygonRings(lng, lat, poly)) {
        const dLng = Math.min(lng - minLng, maxLng - lng);
        const dLat = Math.min(lat - minLat, maxLat - lat);
        const score = Math.min(dLng, dLat);
        if (score > bestScore) {
          bestScore = score;
          best = [lng, lat];
        }
      }
    }
  }
  return best;
}

function englishAdmin1Name(props) {
  const keys = ["name_en", "NAME_EN", "name", "NAME", "nameascii", "NAMEASCII", "woe_name", "gn_name"];
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function isChinaIndiaAdmin1(f) {
  const a3 = String(f?.properties?.adm0_a3 || f?.properties?.ADM0_A3 || "").toUpperCase();
  return a3 === "CHN" || a3 === "IND";
}

async function main() {
  ensureDir(OUT);

  console.log("Fetching ne_10m_admin_1_states_provinces …");
  const admin1 = await fetchJson(`${NE}/ne_10m_admin_1_states_provinces.geojson`);
  const admin1Out = {
    type: "FeatureCollection",
    features: admin1.features.filter(isChinaIndiaAdmin1).map((f) => {
      const poly = pickLargestPolygon(f.geometry);
      const pt = poly ? labelPointForPolygon(poly) : null;
      const nameEn = englishAdmin1Name(f.properties || {});
      return {
        type: "Feature",
        properties: {
          ...f.properties,
          name_en: nameEn || String(f.properties?.name || f.properties?.NAME || ""),
          ...(pt ? { label_lng: pt[0], label_lat: pt[1] } : {}),
        },
        geometry: f.geometry,
      };
    }),
  };

  const admin1Path = path.join(OUT, "admin1-china-india.geojson");
  fs.writeFileSync(admin1Path, JSON.stringify(admin1Out));
  console.log("Wrote", admin1Path, "features:", admin1Out.features.length);

  console.log("Fetching ne_50m_admin_0_countries …");
  const countries = await fetchJson(`${NE}/ne_50m_admin_0_countries.geojson`);
  const countriesPath = path.join(OUT, "countries-50m.geojson");
  fs.writeFileSync(countriesPath, JSON.stringify(countries));
  console.log("Wrote", countriesPath, "features:", countries.features?.length);

  console.log("Fetching ne_10m_populated_places …");
  const places = await fetchJson(`${NE}/ne_10m_populated_places.geojson`);
  const bbox = { minLng: 68, maxLng: 135, minLat: 6, maxLat: 46 };
  const citiesOut = {
    type: "FeatureCollection",
    features: places.features.filter((f) => {
      if (f.geometry?.type !== "Point") return false;
      const [lng, lat] = f.geometry.coordinates;
      if (lng < bbox.minLng || lng > bbox.maxLng || lat < bbox.minLat || lat > bbox.maxLat) return false;
      const adm0 = String(f.properties?.ADM0_A3 || f.properties?.adm0_a3 || "").toUpperCase();
      if (adm0 !== "CHN" && adm0 !== "IND") return false;
      const pop = Number(f.properties?.POP_MAX || f.properties?.pop_max || 0);
      const rank = Number(f.properties?.SCALERANK || f.properties?.scalerank || 99);
      return pop >= 400000 || rank <= 4;
    }),
  };
  const citiesPath = path.join(OUT, "cities-china-india.geojson");
  fs.writeFileSync(citiesPath, JSON.stringify(citiesOut));
  console.log("Wrote", citiesPath, "features:", citiesOut.features.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
