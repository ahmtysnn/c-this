import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        console.log('Fetching models...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );
        const data = await response.json();
        if (data.models) {
            console.log('Available models:');
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log('No models found or error in response:', JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

listModels();
