const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'history-data-new');

const renames = {
    'russian-federation.json': 'russia.json',
    'syrian-arab-republic.json': 'syria.json',
    'korea-north.json': 'north-korea.json',
    'korea-south.json': 'south-korea.json',
    'lao-peoples-democratic-republic.json': 'laos.json',
    'viet-nam.json': 'vietnam.json',
    'palestine-state-of.json': 'palestine.json',
    'united-states-of-america.json': 'united-states.json',
    'congo-democratic-republic-of-the.json': 'democratic-republic-of-the-congo.json',
    'micronesia-federated-states-of.json': 'micronesia.json'
};

console.log('Starting file rename migration...');

Object.entries(renames).forEach(([oldName, newName]) => {
    const oldPath = path.join(dataDir, oldName);
    const newPath = path.join(dataDir, newName);

    if (fs.existsSync(oldPath)) {
        if (!fs.existsSync(newPath)) {
            try {
                fs.renameSync(oldPath, newPath);
                console.log(`[SUCCESS] Renamed: ${oldName} -> ${newName}`);
            } catch (e) {
                console.error(`[ERROR] Failed to rename ${oldName}: ${e.message}`);
            }
        } else {
            console.log(`[SKIPPED] Target already exists: ${newName}`);
        }
    } else {
        // console.log(`[INFO] Source file not found: ${oldName} (probably not generated yet)`);
    }
});

console.log('Migration complete.');
