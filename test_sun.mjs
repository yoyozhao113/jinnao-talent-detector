import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');
const rad2deg = r => r * 180 / Math.PI;

// June 15, 2016 14:30 Beijing time = June 15, 2016 06:30 UTC
const d = new Date(2016, 5, 15, 6, 30, 0); // UTC
const jd = a.julian.DateToJD(d);
console.log('JD:', jd);
console.log('Sun apparentLongitude (rad):', a.solar.apparentLongitude(jd));
console.log('Sun apparentLongitude (deg):', rad2deg(a.solar.apparentLongitude(jd)));
// Should be around 84-85° for June 15 (Gemini)

// Let me also check trueLongitude
const tlon = a.solar.trueLongitude(jd);
console.log('Sun trueLongitude lon (deg):', rad2deg(tlon.lon));

// Check the base date
const d2 = new Date(2000, 0, 1, 0, 0, 0);
console.log('\nY2K JD:', a.julian.DateToJD(d2));
console.log('Y2K Sun lon (deg):', rad2deg(a.solar.apparentLongitude(a.julian.DateToJD(d2))));
// Y2K Sun should be around 280° (Capricorn)
