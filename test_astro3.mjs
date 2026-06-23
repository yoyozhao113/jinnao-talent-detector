import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

const jd = a.julian.DateToJD(new Date(2016, 5, 15, 14, 30, 0));

// Moon position
console.log('moonposition.position(jd):', a.moonposition.position(jd));
const mp = a.moonposition.position(jd);
console.log('moonposition keys:', Object.keys(mp));
console.log('moon lon (rad):', mp.lon, 'deg:', mp.lon * 180 / Math.PI);

// Planet position using VSOP87
const jupiter = new a.planetposition.Planet('jupiter');
console.log('\nJupiter:', jupiter);
// Try position at jd
try {
  const jp = jupiter.position(jd);
  console.log('Jupiter pos:', jp, 'keys:', Object.keys(jp));
} catch(e) { console.log('jupiter err:', e.message); }

// Mercury
try {
  const merc = new a.planetposition.Planet('mercury');
  const mpos = merc.position(jd);
  console.log('Mercury pos:', mpos);
} catch(e) { console.log('mercury err:', e.message); }

// Convert radians to degrees
const rad2deg = r => r * 180 / Math.PI;
console.log('\nSun lon deg:', rad2deg(a.solar.apparentLongitude(jd)));
console.log('Moon lon in deg:', rad2deg(mp.lon));
