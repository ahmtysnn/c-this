const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'living/cost-of-living-data');
if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    console.log(`Deleting ${files.length} files...`);
    files.forEach(file => {
        if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(dir, file));
        }
    });
    console.log('Cleanup complete.');
} else {
    console.log('Directory does not exist.');
}
