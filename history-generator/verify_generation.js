const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const fs = require('fs');

const candidates = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro',
    'gemma-3-4b-it',
    'gemma-2-9b-it',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro'
];

const run = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let log = '';

    for (const modelName of candidates) {
        const msg = `Testing: ${modelName}`;
        console.log(msg);
        log += msg + '\n';
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            const response = await result.response;
            const successMsg = `SUCCESS! Valid model: ${modelName}\nResponse: ${response.text()}`;
            console.log(successMsg);
            log += successMsg + '\n';
            fs.writeFileSync('verify_log.txt', log);
            return;
        } catch (error) {
            const failMsg = `Failed ${modelName}: ${error.message}`;
            console.log(failMsg);
            log += failMsg + '\n';
        }
    }
    log += 'All candidates failed.\n';
    fs.writeFileSync('verify_log.txt', log);
    console.log('All candidates failed.');
};

run();
