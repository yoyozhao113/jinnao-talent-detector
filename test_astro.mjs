import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
  const a = require('astronomia');
  console.log('Loaded astronomia OK');
  console.log('solar keys:', Object.keys(a.solar).join(', '));
  console.log('moon keys:', Object.keys(a.moon).join(', '));
  console.log('planetposition keys:', Object.keys(a.planetposition).join(', '));
  console.log('sidereal keys:', Object.keys(a.sidereal).join(', '));
  console.log('julian keys:', Object.keys(a.julian).join(', '));
  console.log('jupiter keys:', Object.keys(a.jupiter).join(', '));
} catch (e) {
  console.error('FAIL:', e.message);
  console.error(e.stack);
}
