const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const run = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // There isn't a direct listModels method on the client instance in some versions,
        // but let's try a standard generation with a known safe model to see if it works,
        // or rely on the error message which usually lists available models.
        // Actually, newer SDKs usually don't expose listModels easily without admin privileges or specific endpoints.
        // BUT we can try 'gemini-pro' which is the safest bet.

        console.log('Testing gemini-pro...');
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Hello');
        console.log('gemini-pro works:', await result.response.text());
    } catch (error) {
        console.error('gemini-pro failed:', error.message);
    }

    try {
        console.log('Testing gemini-1.5-flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Hello');
        console.log('gemini-1.5-flash works:', await result.response.text());
    } catch (error) {
        console.error('gemini-1.5-flash failed:', error.message);
    }
};

run();
