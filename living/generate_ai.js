const fs = require('fs');
const path = require('path');
// Load env from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load countries and cities
const { COUNTRIES_AND_CITIES } = require('../countriesAndCities.js');

const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, 'cost-of-living-data');

if (!API_KEY) {
    console.error('CRITICAL: GEMINI_API_KEY is missing from .env.local');
    process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper: Kebab case
const toKebabCase = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/-+$/, '');

// Helper: Sleep
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Validate JSON
function validateData(data) {
    if (!data.country || !Array.isArray(data.cities)) return false;
    return true;
}

// Candidates
const MODEL_NAME = 'gemma-3-4b-it';

async function generateWithModel(genAI, modelName, prompt, retries = 3) {
    let text = '';
    try {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.7,
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();

        // Robust JSON extraction
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        } else {
            // Fallback cleanup
            text = text.trim();
            if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '');
            else if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '');
        }

        // Loose parsing to handle minor syntax errors
        try {
            return JSON.parse(text);
        } catch (e) {
            // Function constructor is safer than eval but still permissive
            const looseJson = new Function('return ' + text)();
            return looseJson;
        }
    } catch (error) {
        // Log bad JSON
        if (error instanceof SyntaxError) {
            fs.writeFileSync('debug_output.txt', `FAILED PROMPT OUTPUT:\n${text}\n\nERROR:\n${error.message}`);
        }

        if (error.message.includes('429') && retries > 0) {
            console.log(`Rate limited (${modelName}). Waiting 40s to retry...`);
            await delay(40000); // 40s wait
            return generateWithModel(genAI, modelName, prompt, retries - 1);
        }
        throw error;
    }
}

async function generateCountryData(countryObj, genAI) {
    const { country, cities } = countryObj;

    const prompt = `
    Generate realistic estimated Cost of Living data for ${country}.
    Include data for these specific cities: ${cities.join(', ')}.
    
    CRITICAL RULE: REALISM. 
    - If a specific item (e.g. "McMeal at McDonalds", "Cinema", "Alcohol") DOES NOT EXIST or is not available in a specific city (e.g. Antarctica, remote islands, dry countries), YOU MUST OMIT IT from the list.
    - DO NOT hallucinate prices for services that do not exist there.
    - It is better to have a shorter list of items than incorrect data.
    
    Return a STRICT JSON object matching this schema:
    {
      "country": "${country}",
      "lastUpdated": "${new Date().toISOString()}",
      "currency": "USD", 
      "cities": [
        {
          "city": "City Name",
          "items": [
             // Example items (Only include if they actually exist in the city):
            { "item": "Meal, Inexpensive Restaurant", "price": "15.00", "min": "10.00", "max": "20.00" },
            { "item": "McMeal at McDonalds (or Equivalent Combo Meal)", "price": "10.00", "min": "8.00", "max": "12.00" },
            { "item": "Cappuccino (regular)", "price": "4.50", "min": "3.50", "max": "5.50" },
             { "item": "Coke/Pepsi (0.33 liter bottle)", "price": "2.00", "min": "1.50", "max": "2.50" },
             { "item": "Water (0.33 liter bottle)", "price": "1.50", "min": "1.00", "max": "2.00" },
             { "item": "Milk (regular), (1 liter)", "price": "1.20", "min": "1.00", "max": "1.50" },
             { "item": "Loaf of Fresh White Bread (500g)", "price": "2.50", "min": "2.00", "max": "3.00" },
             { "item": "Rice (white), (1kg)", "price": "2.00", "min": "1.50", "max": "2.50" },
             { "item": "Eggs (regular) (12)", "price": "3.50", "min": "3.00", "max": "4.50" },
             { "item": "Local Cheese (1kg)", "price": "10.00", "min": "8.00", "max": "12.00" },
             { "item": "Chicken Fillets (1kg)", "price": "8.00", "min": "6.00", "max": "10.00" },
             { "item": "Beef Round (1kg) (or Equivalent Back Leg Red Meat)", "price": "12.00", "min": "10.00", "max": "15.00" },
             { "item": "Apples (1kg)", "price": "3.00", "min": "2.00", "max": "4.00" },
             { "item": "Banana (1kg)", "price": "1.50", "min": "1.00", "max": "2.00" },
             { "item": "Oranges (1kg)", "price": "2.50", "min": "2.00", "max": "3.50" },
             { "item": "Tomato (1kg)", "price": "3.00", "min": "2.00", "max": "4.00" },
             { "item": "Potato (1kg)", "price": "2.00", "min": "1.50", "max": "2.50" },
             { "item": "Onion (1kg)", "price": "1.50", "min": "1.00", "max": "2.00" },
             { "item": "Lettuce (1 head)", "price": "1.50", "min": "1.00", "max": "2.00" },
             { "item": "Water (1.5 liter bottle)", "price": "1.00", "min": "0.50", "max": "1.50" },
             { "item": "Bottle of Wine (Mid-Range)", "price": "12.00", "min": "10.00", "max": "15.00" },
             { "item": "Domestic Beer (0.5 liter bottle)", "price": "2.00", "min": "1.50", "max": "2.50" },
             { "item": "Imported Beer (0.33 liter bottle)", "price": "3.00", "min": "2.50", "max": "4.00" },
             { "item": "Cigarettes 20 Pack (Marlboro)", "price": "8.00", "min": "6.00", "max": "10.00" },
             { "item": "One-way Ticket (Local Transport)", "price": "2.00", "min": "1.50", "max": "2.50" },
             { "item": "Monthly Pass (Regular Price)", "price": "50.00", "min": "40.00", "max": "60.00" },
             { "item": "Taxi Start (Normal Tariff)", "price": "3.50", "min": "3.00", "max": "5.00" },
             { "item": "Taxi 1km (Normal Tariff)", "price": "2.00", "min": "1.50", "max": "2.50" },
             { "item": "Taxi 1hour Waiting (Normal Tariff)", "price": "20.00", "min": "15.00", "max": "30.00" },
             { "item": "Gasoline (1 liter)", "price": "1.20", "min": "1.00", "max": "1.50" },
             { "item": "Basic (Electricity, Heating, Cooling, Water, Garbage) for 85m2 Apartment", "price": "150.00", "min": "100.00", "max": "200.00" },
             { "item": "Imternet (60 Mbps or More, Unlimited Data, Cable/ADSL)", "price": "50.00", "min": "40.00", "max": "60.00" },
             { "item": "Fitness Club, Monthly Fee for 1 Adult", "price": "40.00", "min": "30.00", "max": "50.00" },
             { "item": "Tennis Court Rent (1 Hour on Weekend)", "price": "20.00", "min": "15.00", "max": "25.00" },
             { "item": "Cinema, International Release, 1 Seat", "price": "12.00", "min": "10.00", "max": "15.00" },
             { "item": "Preschool (or Kindergarten), Full Day, Private, Monthly for 1 Child", "price": "800.00", "min": "600.00", "max": "1000.00" },
             { "item": "International Primary School, Yearly for 1 Child", "price": "15000.00", "min": "10000.00", "max": "20000.00" },
             { "item": "1 Pair of Jeans (Levis 501 or Similar)", "price": "60.00", "min": "40.00", "max": "80.00" },
             { "item": "1 Summer Dress in Chain Store (Zara, H&M, ...)", "price": "40.00", "min": "30.00", "max": "50.00" },
             { "item": "1 Pair of Nike Running Shoes (Mid-Range)", "price": "80.00", "min": "60.00", "max": "100.00" },
             { "item": "1 Pair of Men Leather Business Shoes", "price": "100.00", "min": "80.00", "max": "120.00" },
             { "item": "Apartment (1 bedroom) in City Centre", "price": "1500.00", "min": "1200.00", "max": "1800.00" },
             { "item": "Apartment (1 bedroom) Outside of Centre", "price": "1200.00", "min": "1000.00", "max": "1400.00" },
             { "item": "Apartment (3 bedrooms) in City Centre", "price": "2500.00", "min": "2000.00", "max": "3000.00" },
             { "item": "Apartment (3 bedrooms) Outside of Centre", "price": "2000.00", "min": "1600.00", "max": "2400.00" },
             { "item": "Price per Square Meter to Buy Apartment in City Centre", "price": "5000.00", "min": "4000.00", "max": "6000.00" },
             { "item": "Price per Square Meter to Buy Apartment Outside of Centre", "price": "3500.00", "min": "3000.00", "max": "4000.00" },
             { "item": "Average Monthly Net Salary (After Tax)", "price": "3000.00", "min": "2000.00", "max": "4000.00" },
             { "item": "Mortgage Interest Rate in Percentages (%), Yearly, for 20 Years Fixed-Rate", "price": "5.00", "min": "4.00", "max": "6.00" }
          ]
        }
      ]
    }
    
    IMPORTANT: Provide realistic values for ${country}. Currencies should be converted to USD approximation.
    Do NOT output Markdown. Output purely the JSON string.
  `;

    try {
        return await generateWithModel(genAI, MODEL_NAME, prompt);
    } catch (err) {
        console.error(`Error generating for ${country}:`, err.message);
        return null;
    }
}

async function main() {
    console.log('Starting AI Cost of Living Generation (Library Version with Robust Parsing)...');
    const genAI = new GoogleGenerativeAI(API_KEY);

    // Sort alphabetical
    const sortedCountries = [...COUNTRIES_AND_CITIES].sort((a, b) => a.country.localeCompare(b.country));

    for (const countryObj of sortedCountries) {
        // Limit to 3 cities to prevent context/token overflow - AGGRESSIVE LIMIT
        countryObj.cities = countryObj.cities.slice(0, 3);

        const slug = toKebabCase(countryObj.country);
        // Flat structure check
        const outFile = path.join(OUTPUT_DIR, `${slug}.json`);

        if (fs.existsSync(outFile)) {
            try {
                const content = fs.readFileSync(outFile, 'utf8');
                if (content.trim().length > 0) {
                    JSON.parse(content);
                    console.log(`Skipping ${countryObj.country} (already exists)`);
                    continue;
                }
            } catch (e) {
                console.log(`Re-generating ${countryObj.country} (invalid existing file)`);
            }
        }

        console.log(`Generating data for ${countryObj.country} (Cities: ${countryObj.cities.length})...`);
        const data = await generateCountryData(countryObj, genAI);

        if (data && validateData(data)) {
            fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
            console.log(`[SUCCESS] Saved ${slug}.json`);
        } else {
            console.error(`[FAILURE] Failed to generate valid data for ${countryObj.country}`);
        }

        await delay(2000);
    }
}

main();
