// Chinese cities database with coordinates
const provinces = require('china-division/dist/pc.json');
const { ChinaCitiesCoordinate } = require('better-echarts-maps');

const cityData = [];

for (const [province, cities] of Object.entries(provinces)) {
  for (const city of cities) {
    const coords = ChinaCitiesCoordinate[city];
    if (coords && coords[0] != null && coords[1] != null) {
      cityData.push({
        name: city,
        province,
        lng: coords[0],
        lat: coords[1]
      });
    }
  }
  // Also add municipality/province itself if it has coordinates
  if (ChinaCitiesCoordinate[province]) {
    const coords = ChinaCitiesCoordinate[province];
    cityData.push({
      name: province,
      province,
      lng: coords[0],
      lat: coords[1]
    });
  }
}

function getCityCoords(cityName) {
  if (!cityName) return { lat: 39.9042, lon: 116.4074 };
  const city = cityData.find(c => c.name === cityName || cityName.startsWith(c.name.replace('市','')));
  if (city) return { lat: city.lat, lon: city.lng };
  return { lat: 39.9042, lon: 116.4074 };
}

function getCitiesForFrontend() {
  return cityData.map(c => ({ name: c.name, province: c.province }));
}

module.exports = { getCityCoords, getCitiesForFrontend };
