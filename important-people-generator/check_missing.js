import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { COUNTRIES } from './countries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'people-data');
const existingFiles = fs.readdirSync(dataDir);

const missingCountries = COUNTRIES.filter(country => {
    // Normalize country name to slug format (lowercase, hyphens)
    // This is a simple approximation; some might need special handling
    let slug = country.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[()]/g, '')
        .replace(/'/g, '')
        .replace(/\./g, '')
        .replace(/--+/g, '-'); // Replace multiple hyphens with single

    // Special cases based on previous files
    if (country === 'Congo (Democratic Republic of the)') slug = 'dr-congo';
    if (country === 'Russian Federation') slug = 'russia';
    if (country === 'Viet Nam') slug = 'vietnam';
    if (country === 'Korea (South)') slug = 'south-korea';
    if (country === 'Korea (North)') slug = 'north-korea';
    if (country === 'United States of America') slug = 'united-states';

    const filename = `${slug}-people.json`;
    return !existingFiles.includes(filename);
});

console.log(`Total countries in list: ${COUNTRIES.length}`);
console.log(`Missing countries: ${missingCountries.length}`);
fs.writeFileSync(path.join(__dirname, 'missing.json'), JSON.stringify(missingCountries, null, 2));
console.log('Missing list written to missing.json');
