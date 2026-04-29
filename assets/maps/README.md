# Map tiles (optional PMTiles)

The live map page uses **MapLibre GL JS** with **GeoJSON** under [`assets/geojson/`](../geojson/). That keeps GitHub Pages simple and avoids a Tippecanoe dependency in CI.

To produce a **single-file PMTiles** archive for faster loads or higher zoom (optional):

1. Install [Tippecanoe](https://github.com/felt/tippecanoe).
2. From the repo root, after generating GeoJSON with `node scripts/build-map-data.mjs`:

```bash
tippecanoe -o assets/maps/admin-in-cn.pmtiles -L admin1:assets/geojson/admin1-china-india.geojson -L countries:assets/geojson/countries-50m.geojson --force
```

3. Register the PMTiles protocol in the page (see [pmtiles](https://github.com/protomaps/pmtiles) + MapLibre example) and point a vector `source` at `pmtiles://…` instead of inline GeoJSON.

If `assets/maps/*.pmtiles` grows large, use **Git LFS** for the binary.
