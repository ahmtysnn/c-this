const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const candidates = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-001'
];

const run = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    for (const modelName of candidates) {
        console.log(`Testing: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hi');
            const response = await result.response;
            console.log(`SUCCESS! Valid model: ${modelName}`);
            console.log('Response:', response.text());
            return; // Stop after first success
        } catch (error) {
            console.log(`Failed ${modelName}: ${error.message.split(' ')[0]}... (See full log if needed)`);
        }
    }
    console.log('All candidates failed.');
};

run();
