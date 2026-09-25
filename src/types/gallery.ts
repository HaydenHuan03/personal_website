/**
 * Gallery manifest contract. This exact shape will later be written by the
 * CMS into R2 as `manifest.json`; keep it JSON-serializable and versioned.
 */
export interface GalleryAttribution {
  author: string;
  source: string;
  license: string;
}

export interface GalleryLandmark {
  name: string;
  /** URL or site-relative path to a meshopt-compressed glTF binary. */
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
  /** Describes the photo for screen readers; the caption stands in when absent. */
  alt?: string;
}

export interface GalleryCountry {
  /** ISO 3166-1 numeric code as a string - matches world-atlas feature ids. */
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
