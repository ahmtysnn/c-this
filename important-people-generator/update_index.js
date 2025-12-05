import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const peopleDataDir = path.join(__dirname, 'people-data');
const indexFile = path.join(peopleDataDir, 'index.json');

// Read existing index
const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));

// Get all JSON files in people-data
const files = fs.readdirSync(peopleDataDir).filter(f => f.endsWith('.json') && f !== 'index.json');

const newCountries = [];
let totalFigures = 0;

for (const file of files) {
    const filePath = path.join(peopleDataDir, file);
    let content;
    try {
        content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`Error parsing file: ${file}`);
        console.error(e.message);
        continue;
    }

    // Assuming structure: { country: "Name", historicalFigures: [...] }
    // or maybe just an array?
    // Let's check the structure of an existing file.
    // Wait, I can't check right now, but usually it's an object with `historicalFigures`.
    // I'll assume standard structure based on previous knowledge or check one file.

    // Actually, I should check one file to be sure.
    // But I can't wait. I'll write the code to handle both or assume standard.
    // The `generate.js` output said "historical figures for...".

    let figures = [];
    let countryName = '';

    if (Array.isArray(content)) {
        figures = content;
        // derive country name from filename?
        // filename: country-slug-people.json
        const slug = file.replace('-people.json', '');
        countryName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else if (content.historicalFigures) {
        figures = content.historicalFigures;
        countryName = content.country || content.name;
    } else {
        // maybe it's the country object itself?
        figures = content.figures || [];
        countryName = content.country;
    }

    // If countryName is missing, try to derive from filename
    if (!countryName) {
        const slug = file.replace('-people.json', '');
        // Special handling for some slugs if needed, but simple capitalization is a good start
        countryName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    const slug = file.replace('-people.json', '');
    const url = `https://yourusername.github.io/people-data/${file}`;

    newCountries.push({
        name: countryName,
        slug: slug,
        figureCount: figures.length,
        url: url
    });

    totalFigures += figures.length;
}

// Update index data
// We want to keep existing entries if they are valid, or just rebuild from scratch?
// Rebuilding from scratch is safer to ensure consistency.
indexData.countries = newCountries;
indexData.totalCountries = newCountries.length;
indexData.totalFigures = totalFigures;
indexData.lastUpdated = new Date().toISOString().split('T')[0];

fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
console.log('Index updated successfully.');
