import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

const jd = a.julian.DateToJD(new Date(2016, 5, 15, 14, 30, 0));
const rad2deg = r => r * 180 / Math.PI;
const deg2rad = d => d * Math.PI / 180;
const obl = deg2rad(23.4392911);

// Sun - returns radians already
const sunLon = a.solar.apparentLongitude(jd);
console.log('Sun longitude (deg):', rad2deg(sunLon));

// Moon - get equatorial then convert manually to ecliptic
const mp = a.moonposition.position(jd);
const ra = mp.ra();
const dec = mp.dec();
console.log('Moon RA (deg):', rad2deg(ra), 'Dec (deg):', rad2deg(dec));

// Simple equatorial to ecliptic conversion (using mean obliquity)
// λ = atan2(sin(α)*cos(ε) + tan(δ)*sin(ε), cos(α))
// β = asin(sin(δ)*cos(ε) - cos(δ)*sin(ε)*sin(α))
const moonLon = Math.atan2(Math.sin(ra) * Math.cos(obl) + Math.tan(dec) * Math.sin(obl), Math.cos(ra));
const moonLat = Math.asin(Math.sin(dec) * Math.cos(obl) - Math.cos(dec) * Math.sin(obl) * Math.sin(ra));
console.log('Moon ecliptic lon (deg):', rad2deg(moonLon), 'lat (deg):', rad2deg(moonLat));

// Test coord.Ecliptic and Equatorial conversions
const eq = new a.coord.Equatorial(ra, dec);
console.log('\nEquatorial:', eq);
console.log('Equatorial proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(eq)));

// Try using Ecliptic constructor
const ecl = new a.coord.Ecliptic(1, 0.1);
console.log('Ecliptic lon/lat:', ecl.lon(), ecl.lat());
const eq2 = ecl.toEquatorial();
console.log('Equatorial from ecliptic:', eq2.ra(), eq2.dec(), 'rad2deg:', rad2deg(eq2.ra()), rad2deg(eq2.dec()));

// Maybe Equatorial has toEcliptic
if (typeof eq.toEcliptic === 'function') {
  const result = eq.toEcliptic();
  console.log('toEcliptic result:', result, result.lon(), result.lat());
}

// Check what properties Equatorial has
console.log('\nEquatorial constructor length:', a.coord.Equatorial.length);
const eqInstance = new a.coord.Equatorial(0, 0);
for (let key of Object.getOwnPropertyNames(Object.getPrototypeOf(eqInstance))) {
  console.log('  method:', key, typeof eqInstance[key]);
}
