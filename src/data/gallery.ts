import type { GalleryManifest, GalleryPhoto } from '@/types/gallery';

/** Photos live in `public/photo/<country>/`, with 480px WebP thumbnails in `thumb/`. */
function photo(dir: string, name: string, width: number, height: number, caption = '', alt?: string): GalleryPhoto {
  return {
    id: name.toLowerCase(),
    src: `/photo/${dir}/${name}.jpeg`,
    thumb: `/photo/${dir}/thumb/${name}.webp`,
    width,
    height,
    caption,
    alt,
  };
}

export const GALLERY: GalleryManifest = {
  version: 1,
  countries: [
    {
      id: '158',
      name: 'Taiwan',
      visitedAt: '2026-07',
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
        photo('taiwan', 'Taiwan_1', 1080, 810, 'Taipei 101 · 台北101', 'Group selfie with friends in front of Taipei 101'),
        photo('taiwan', 'Taiwan_2', 1080, 810, '', 'Another group selfie at Taipei 101, one friend mid-shout'),
        photo('taiwan', 'Taiwan_3', 810, 1080, 'Ningxia Night Market · 寧夏夜市', 'Red neon sign of Ningxia Night Market at dusk'),
        photo('taiwan', 'Taiwan_4', 810, 1080, 'Ximending · 西門町', 'Standing on the rainbow crossing in Ximending'),
        photo('taiwan', 'Taiwan_5', 810, 1080, 'The Red House · 西門紅樓', 'Standing in front of the red-brick Red House in Ximending'),
        photo('taiwan', 'Taiwan_6', 810, 1080, 'Xuanguang Pier · 玄光碼頭', 'Standing under the wooden gate of Xuanguang Pier at Sun Moon Lake'),
        photo('taiwan', 'Taiwan_7', 1080, 810, '', 'Selfie at the foot of mossy stone steps, friends posing on the stairs behind'),
        photo('taiwan', 'Taiwan_8', 1080, 810, 'Sun Moon Lake · 日月潭', 'Selfie with friends beside the Sun Moon Lake stone'),
        photo('taiwan', 'Taiwan_9', 809, 1080, '', 'Quiet street with a cyclist and parked cars'),
        photo('taiwan', 'Taiwan_10', 1080, 810, 'Sun Moon Lake cable car · 日月潭纜車', 'Friends in a cable car cabin above Sun Moon Lake'),
        photo('taiwan', 'Taiwan_11', 1080, 810, '', 'Selfie with friends by a green lake'),
        photo('taiwan', 'Taiwan_12', 810, 1080, '', 'Standing below Taipei 101'),
      ],
    },
  ],
};
