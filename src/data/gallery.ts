import type { GalleryManifest, GalleryPhoto } from '../types/gallery';

/**
 * Placeholder gallery data. Photos are picsum.photos placeholders until the
 * CMS + R2 backend exists; the shape is the real manifest contract.
 */
function placeholder(id: string, width: number, height: number, caption = ''): GalleryPhoto {
  return {
    id,
    src: `https://picsum.photos/seed/${id}/${width}/${height}`,
    thumb: `https://picsum.photos/seed/${id}/${Math.round(width / 3)}/${Math.round(height / 3)}`,
    width,
    height,
    caption,
  };
}

export const GALLERY: GalleryManifest = {
  version: 1,
  countries: [
    {
      id: '158',
      name: 'Taiwan',
      visitedAt: '2025-03',
      landmark: {
        name: 'Taipei 101',
        model: '/gallery/twn/landmark.glb',
        attribution: {
          author: 'Elaine Wijaya Oey',
          source: 'https://poly.pizza/m/c4ZLE4L0gT3',
          license: 'CC BY 3.0',
        },
      },
      photos: [
        placeholder('twn-01', 1600, 1067, 'Taipei skyline'),
        placeholder('twn-02', 1067, 1600, 'Night market'),
        placeholder('twn-03', 1600, 1067),
        placeholder('twn-04', 1600, 1200),
        placeholder('twn-05', 1067, 1600, 'Jiufen lanterns'),
        placeholder('twn-06', 1600, 1067),
        placeholder('twn-07', 1600, 1067, 'Elephant Mountain'),
        placeholder('twn-08', 1200, 1600),
        placeholder('twn-09', 1600, 1067),
        placeholder('twn-10', 1600, 900, 'Sun Moon Lake'),
        placeholder('twn-11', 1067, 1600),
        placeholder('twn-12', 1600, 1067),
      ],
    },
  ],
};
