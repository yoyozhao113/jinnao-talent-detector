import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

const jd = a.julian.DateToJD(new Date(2016, 5, 15, 14, 30, 0));
const rad2deg = r => r * 180 / Math.PI;
const obl = 23.4392911 * Math.PI / 180;

// Sun
const sunLon = a.solar.apparentLongitude(jd);
console.log('Sun lon deg:', rad2deg(sunLon));

// Moon - access properties directly
const mp = a.moonposition.position(jd);
console.log('Moon raw:', mp);
console.log('Moon _ra:', mp._ra, '_dec:', mp._dec);
console.log('Moon props:', Object.keys(mp));
console.log('Moon proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(mp)));

// Access ra/dec directly
const ra = mp._ra;
const dec = mp._dec;

// Simple equatorial to ecliptic
const moonLon = Math.atan2(Math.sin(ra) * Math.cos(obl) + Math.tan(dec) * Math.sin(obl), Math.cos(ra));
const moonLat = Math.asin(Math.sin(dec) * Math.cos(obl) - Math.cos(dec) * Math.sin(obl) * Math.sin(ra));
console.log('Moon ecliptic lon deg:', rad2deg(moonLon), 'lat deg:', rad2deg(moonLat));

// Try Equatorial class
const eq = new a.coord.Equatorial(ra, dec);
console.log('\nEquatorial class:', Object.getOwnPropertyNames(Object.getPrototypeOf(eq)));

// Check if Equatorial has properties
console.log('eq._ra:', eq._ra, 'eq._dec:', eq._dec);
