import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const a = require('astronomia');

// Test basic calculations
const jd = a.julian.DateToJD(new Date(2016, 5, 15, 14, 30, 0));
console.log('JD:', jd);

// Sun
console.log('Sun apparentLongitude:', a.solar.apparentLongitude(jd));
console.log('Sun trueLongitude:', a.solar.trueLongitude(jd));

// Moon - need to find the right API
console.log('\nmoonposition keys:', Object.keys(a.moonposition).join(', '));

// Check moonposition API
if (a.moonposition) {
  console.log('\nmoonposition:', Object.getOwnPropertyNames(a.moonposition).join(', '));
  // Try calling
  try {
    const mp = a.moonposition(jd);
    console.log('moonposition result:', mp);
  } catch(e) {
    console.log('moonposition error:', e.message);
  }
}

// Check planetposition
console.log('\nplanetposition.Planet:', typeof a.planetposition.Planet);
// Try to compute a planet
try {
  const mercury = a.planetposition.Planet('mercury');
  console.log('mercury:', mercury);
} catch(e) {
  console.log('planet error:', e.message);
}

// Check sidereal
console.log('\nsidereal.mean(jd):', a.sidereal.mean(jd));
console.log('sidereal.apparent(jd):', a.sidereal.apparent(jd));
