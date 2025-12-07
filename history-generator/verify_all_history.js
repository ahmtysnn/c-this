const fs = require('fs');
const path = require('path');
const { COUNTRIES } = require('../countries');

const HISTORY_DIR = path.join(__dirname, 'history-data-new');
const toKebabCase = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/-+$/, '');

const verify = () => {
    console.log('Verifying all country history files...');
    let missing = [];
    let invalid = [];
    let empty = [];
    let validCount = 0;

    COUNTRIES.forEach(country => {
        const filename = `${toKebabCase(country)}.json`;
        const filePath = path.join(HISTORY_DIR, filename);

        if (!fs.existsSync(filePath)) {
            missing.push(country);
            return;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.trim()) {
                empty.push(country);
                return;
            }
            const data = JSON.parse(content);
            if (!data.historicalContext || !data.historicalPeriods || data.historicalPeriods.length === 0) {
                invalid.push(`${country} (Missing required fields)`);
            } else {
                validCount++;
            }
        } catch (e) {
            invalid.push(`${country} (JSON Parse Error: ${e.message})`);
        }
    });

    console.log('\n--- Verification Results ---');
    console.log(`Total Countries: ${COUNTRIES.length}`);
    console.log(`Valid Files: ${validCount}`);
    console.log(`Missing Files: ${missing.length}`);
    console.log(`Invalid/Corrupt Files: ${invalid.length}`);
    console.log(`Empty Files: ${empty.length}`);

    if (missing.length > 0) {
        console.log('\nMissing Countries:');
        missing.forEach(c => console.log(` - ${c} (${toKebabCase(c)}.json)`));
    }

    if (invalid.length > 0) {
        console.log('\nInvalid Files:');
        invalid.forEach(c => console.log(` - ${c}`));
    }

    if (empty.length > 0) {
        console.log('\nEmpty Files:');
        empty.forEach(c => console.log(` - ${c}`));
    }
};

verify();
