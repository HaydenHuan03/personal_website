/** Shape of the gallery data. A CMS will later write it to R2 as `manifest.json`, so keep it plain JSON. */
export interface GalleryAttribution {
  author: string;
  source: string;
  license: string;
}

export interface GalleryLandmark {
  name: string;
  /** URL or path to the compressed 3D model (.glb). */
  model: string;
  attribution: GalleryAttribution;
}

export interface GalleryPhoto {
  id: string;
  /** Full-size image, <=1600px long edge. */
  src: string;
  /** Grid thumbnail, <=480px long edge. */
  thumb: string;
  width: number;
  height: number;
  caption: string;
  /** Screen-reader text; falls back to the caption. */
  alt?: string;
}

export interface GalleryCountry {
  /** Numeric ISO country code as a string, matching the world map ids. */
  id: string;
  name: string;
  /** "YYYY-MM" */
  visitedAt: string;
  landmark: GalleryLandmark;
  photos: GalleryPhoto[];
}

export interface GalleryManifest {
  version: 1;
  countries: GalleryCountry[];
}

/** Country outlines baked by `scripts/build-world-map.ts` into `src/data/`. */
export interface WorldMapCountry {
  id: string;
  name: string;
  d: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  /** Sharper outline for the `detailIds` countries, used when a country is shown large. */
  detailD?: string;
  /** Centre of `detailD`. */
  detailCentroid?: [number, number];
}

export interface WorldMapSnapshot {
  viewBox: [number, number, number, number];
  countries: WorldMapCountry[];
}
