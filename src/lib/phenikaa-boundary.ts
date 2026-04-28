// Phenikaa University boundary — real OSM polygon (way 973433275)
// Source: Nominatim (amenity=university)

export const PHENIKAA_BOUNDARY: [number, number][] = [
  [20.9607624, 105.7449939],
  [20.9605597, 105.7449958],
  [20.9602035, 105.7456692],
  [20.9597185, 105.7464883],
  [20.9590702, 105.7474691],
  [20.9590997, 105.7475714],
  [20.9599728, 105.7486879],
  [20.9602967, 105.7490281],
  [20.9610071, 105.7494635],
  [20.9613301, 105.7496114],
  [20.9621834, 105.7499193],
  [20.9624193, 105.7488223],
  [20.9629585, 105.7492143],
  [20.9631280, 105.7491119],
  [20.9625917, 105.7481550],
  [20.9621261, 105.7473199],
  [20.9617439, 105.7467262],
  [20.9607624, 105.7449939],
];

const lats = PHENIKAA_BOUNDARY.map((p) => p[0]);
const lngs = PHENIKAA_BOUNDARY.map((p) => p[1]);

export const PHENIKAA_BBOX = {
  minLat: Math.min(...lats),
  maxLat: Math.max(...lats),
  minLon: Math.min(...lngs),
  maxLon: Math.max(...lngs),
};

export const PHENIKAA_CENTER: [number, number] = [
  (PHENIKAA_BBOX.minLat + PHENIKAA_BBOX.maxLat) / 2,
  (PHENIKAA_BBOX.minLon + PHENIKAA_BBOX.maxLon) / 2,
];
