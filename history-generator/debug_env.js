const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

console.log('Loaded Environment Variables:');
Object.keys(process.env).forEach(key => {
    if (key.includes('KEY') || key.includes('GOOGLE') || key.includes('GEMINI')) {
        console.log(`${key}: ${process.env[key] ? '***EXISTS***' : 'MISSING'}`);
    }
});
