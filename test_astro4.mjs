import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');
const rad2deg = r => r * 180 / Math.PI;
const deg2rad = d => d * Math.PI / 180;

const jd = a.julian.DateToJD(new Date(2016, 5, 15, 14, 30, 0));

// Moon: convert equatorial to ecliptic using coord module
const mp = a.moonposition.position(jd);
const obl = 23.4392911; // degrees
const eq = new a.coord.Equatorial(mp._ra, mp._dec);
const ec = eq.toEcliptic('J2000'); // or use nutation
console.log('Moon equatorial:', mp._ra, mp._dec);
console.log('Moon ecliptic lon (rad):', ec.lon, 'deg:', rad2deg(ec.lon));
console.log('Moon ecliptic lat (rad):', ec.lat, 'deg:', rad2deg(ec.lat));

// Actually, let me try the proper nutation-aware conversion
// Using apparent position
const nut = a.nutation.nutation(jd);
console.log('\nNutation:', nut);
console.log('Nutation in longitude (deg):', rad2deg(nut.dpsi), 'obliquity (deg):', rad2deg(nut.deps));

// Let's check coord module
console.log('\ncoord keys:', Object.keys(a.coord));
console.log('Ecliptic:', typeof a.coord.Ecliptic);

// Try a simpler approach: coord.ecliptic
const ecl = new a.coord.Ecliptic(0, 0);
console.log('\nEcliptic methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ecl)));

// Actually check what Coord base class has
console.log('\nCoord keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(mp)));

// Let's look at what coord module exports directly
console.log('\ncoord package:', a.coord);
const coordModule = require.resolve('astronomia/lib/coord.cjs');
console.log('coord path:', coordModule);
