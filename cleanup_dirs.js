const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'living/cost-of-living-data');

if (!fs.existsSync(OUTPUT_DIR)) {
    console.log('No output directory found.');
    process.exit(0);
}

const items = fs.readdirSync(OUTPUT_DIR);

items.forEach(item => {
    const itemPath = path.join(OUTPUT_DIR, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
        const indexFile = path.join(itemPath, 'index.json');
        const targetFile = path.join(OUTPUT_DIR, `${item}.json`);

        if (fs.existsSync(indexFile)) {
            // Move file
            // Only move if target doesn't exist or is empty
            if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size === 0) {
                fs.renameSync(indexFile, targetFile);
                console.log(`Moved ${item}/index.json to ${item}.json`);
            }
        }

        // Try to remove directory (will fail if not empty, which is fine)
        try {
            fs.rmdirSync(itemPath);
            console.log(`Removed directory ${item}`);
        } catch (e) {
            // directory not empty
        }
    }
});
