
const fs = require('fs');
const path = require('path');

const { COUNTRIES_AND_CITIES } = require('../countriesAndCities.js');
const indexData = require('./people-data/index.json');

const doneCountries = new Set(indexData.countries.map(c => c.name.toLowerCase()));

// Manual mapping for discrepancies
const nameMapping = {
  'United States of America': 'United States',
  'Russian Federation': 'Russia',
  'Korea (South)': 'South Korea',
  'Korea (North)': 'North Korea',
  'Viet Nam': 'Vietnam',
  'Syrian Arab Republic': 'Syria',
  'Congo (Democratic Republic of the)': 'Democratic Republic of the Congo',
  'Czechia': 'Czech Republic',
  'Côte d\'Ivoire': 'Côte d\'Ivoire', // This one seems to match but good to be sure
  'Myanmar': 'Myanmar',
  'Tanzania': 'Tanzania', // United Republic of Tanzania in some lists
  'Bolivia': 'Bolivia', // Plurinational State of Bolivia
  'Venezuela': 'Venezuela', // Bolivarian Republic of Venezuela
  'Iran': 'Iran', // Islamic Republic of Iran
  'Moldova': 'Moldova', // Republic of Moldova
  'Lao People\'s Democratic Republic': 'Laos', // Might be just Laos in some contexts, but let's check
  'Micronesia (Federated States of)': 'Micronesia',
  'Palestine, State of': 'Palestine',
  'Taiwan': 'Taiwan', // Province of China
  'Brunei Darussalam': 'Brunei',
  'Timor-Leste': 'East Timor',
  'Cabo Verde': 'Cape Verde',
  'Eswatini': 'Swaziland', // Old name
  'North Macedonia': 'Macedonia', // Old name
};

const missingCountries = [];

for (const item of COUNTRIES_AND_CITIES) {
  let name = item.country;
  if (nameMapping[name]) {
    name = nameMapping[name];
  }
  
  // Also check if the mapped name is in doneCountries
  // We check both original and mapped name against the set
  if (!doneCountries.has(name.toLowerCase()) && !doneCountries.has(item.country.toLowerCase())) {
     // Filter out small territories or uninhabited places if needed, 
     // but for now let's just take the next ones.
     // Some in the list are territories, but let's stick to the list order.
     missingCountries.push(item.country);
  }
}

console.log('Next 5 countries:');
console.log(JSON.stringify(missingCountries.slice(0, 5), null, 2));
