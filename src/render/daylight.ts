import { Color } from 'three';
const keys = [
  {
    step: 0,
    ambient: 0.65,
    sun: 0.45,
    ambientColour: '#8298bd',
    sunColour: '#9cb9ef',
    skyTop: '#22334a',
    skyBottom: '#0f1822',
    night: 1,
  },
  {
    step: 22,
    ambient: 0.8,
    sun: 0.65,
    ambientColour: '#dce8e4',
    sunColour: '#ffe0cc',
    skyTop: '#f4cbb8',
    skyBottom: '#b5cbdc',
    night: 0.8,
  },
  {
    step: 28,
    ambient: 1.8,
    sun: 1.8,
    ambientColour: '#eef4ff',
    sunColour: '#ffe8c3',
    skyTop: '#f4f7f7',
    skyBottom: '#d8e5ec',
    night: 0,
  },
  {
    step: 48,
    ambient: 2,
    sun: 2.3,
    ambientColour: '#ffffff',
    sunColour: '#fff1db',
    skyTop: '#f4f7f7',
    skyBottom: '#d8e5ec',
    night: 0,
  },
  {
    step: 70,
    ambient: 1.4,
    sun: 1.8,
    ambientColour: '#b8cbd8',
    sunColour: '#ffcb83',
    skyTop: '#e1c7ad',
    skyBottom: '#a8becd',
    night: 0.15,
  },
  {
    step: 72,
    ambient: 1.25,
    sun: 1.1,
    ambientColour: '#91a5c9',
    sunColour: '#a9b9ed',
    skyTop: '#455875',
    skyBottom: '#26384d',
    night: 0.55,
  },
  {
    step: 84,
    ambient: 0.65,
    sun: 0.45,
    ambientColour: '#8298bd',
    sunColour: '#9cb9ef',
    skyTop: '#22334a',
    skyBottom: '#0f1822',
    night: 1,
  },
  {
    step: 96,
    ambient: 0.65,
    sun: 0.45,
    ambientColour: '#8298bd',
    sunColour: '#9cb9ef',
    skyTop: '#22334a',
    skyBottom: '#0f1822',
    night: 1,
  },
];
export function daylightAt(step: number, building = false) {
  const local = ((step % 96) + 96) % 96,
    index = keys.findIndex((k, i) => i > 0 && k.step >= local),
    b = keys[index < 1 ? 1 : index],
    a = keys[index < 1 ? 0 : index - 1];
  const t = (local - a.step) / (b.step - a.step),
    mix = (x: number, y: number) => x + (y - x) * t;
  const colour = (x: string, y: string) =>
    '#' + new Color(x).lerp(new Color(y), t).getHexString();
  const held = building && mix(a.night, b.night) > keys[5].night;
  return {
    ambient: Math.max(building ? 1.25 : 0, mix(a.ambient, b.ambient)),
    sun: Math.max(building ? 1.1 : 0, mix(a.sun, b.sun)),
    night: building
      ? Math.min(keys[5].night, mix(a.night, b.night))
      : mix(a.night, b.night),
    ambientColour: held
      ? keys[5].ambientColour
      : colour(a.ambientColour, b.ambientColour),
    sunColour: held ? keys[5].sunColour : colour(a.sunColour, b.sunColour),
    skyTop: held ? keys[5].skyTop : colour(a.skyTop, b.skyTop),
    skyBottom: held ? keys[5].skyBottom : colour(a.skyBottom, b.skyBottom),
  };
}
