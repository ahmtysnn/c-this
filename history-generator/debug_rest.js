const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('No GEMINI_API_KEY found');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log('Available Models:');
                json.models.forEach(m => console.log(m.name));
            } else {
                console.log('Error Response:', JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log('Response (non-JSON):', data);
        }
    });
}).on('error', (e) => {
    console.error('Request Error:', e);
});
