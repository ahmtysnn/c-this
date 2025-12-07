const fs = require('fs');
const path = require('path');
const { COUNTRIES } = require('../countries.js');

const dataDir = path.join(__dirname, 'history-data-new');
const files = fs.readdirSync(dataDir);
const fileSet = new Set(files.map(f => f.toLowerCase()));

console.log(`Total countries in list: ${COUNTRIES.length}`);
console.log(`Total files in directory: ${files.length}`);

const missing = [];
const found = [];

COUNTRIES.forEach(country => {
    // Normalization logic used in generation (guessing)
    // Attempt 1: Just lowercase and spaces to hyphens
    let filename1 = country.toLowerCase().replace(/ /g, '-') + '.json';
    // Attempt 2: Remove special chars
    let filename2 = country.toLowerCase().replace(/ /g, '-').replace(/[(),']/g, '') + '.json';

    // Check various possibilities
    if (fileSet.has(filename1)) {
        found.push({ country, file: filename1 });
    } else if (fileSet.has(filename2)) {
        found.push({ country, file: filename2 });
    } else {
        // specific checks for problematic names
        let foundMatch = false;
        for (const f of files) {
            if (f.toLowerCase().startsWith(country.toLowerCase().split(' ')[0])) {
                // checking if it looks similar
            }
        }
        missing.push(country);
    }
});

console.log('--- MISSING COUNTRIES ---');
missing.forEach(c => console.log(c));

console.log('\n--- SPECIFIC CHECKS ---');
['Kyrgyzstan', 'Kazakhstan'].forEach(c => {
    const isMissing = missing.includes(c);
    console.log(`${c}: ${isMissing ? 'MISSING' : 'FOUND'}`);
});
