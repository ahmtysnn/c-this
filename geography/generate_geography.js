const fs = require('fs');
const path = require('path');
// Load env from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load countries
const { COUNTRIES } = require('../countries.js'); // Using strict list from countries.js

const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, 'geography-nature-data');

if (!API_KEY) {
    console.error('CRITICAL: GEMINI_API_KEY is missing from .env.local');
    process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper: Kebab case (normalized)
const toKebabCase = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/-+$/, '');

// Helper: Sleep
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Candidate Model
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

        // Loose parsing
        try {
            return JSON.parse(text);
        } catch (e) {
            const looseJson = new Function('return ' + text)();
            return looseJson;
        }
    } catch (error) {
        if (error.message.includes('429') && retries > 0) {
            console.log(`Rate limited (${modelName}). Waiting 40s to retry...`);
            await delay(40000); // 40s wait
            return generateWithModel(genAI, modelName, prompt, retries - 1);
        }
        console.error(`Error generating: ${error.message}`);
        return null;
    }
}

async function generateCountryGeography(country, genAI) {
    const prompt = `
    Generate beautiful, detailed, and accurate Geography & Nature data for ${country}.
    
    The output MUST be valid JSON adhering to this TypeScript interface structure:
    
    interface QuickFact {
      label: string;
      value: string;
      icon: string; // Use Lucide icon names like 'Mountain', 'Droplets', 'Wind', 'MapPin', 'Sun', 'Cloud', 'Leaf'
      description: string;
      detail: string;
    }

    interface SeasonalCharacteristic {
      name: string;
      period: string;
      description: string;
      keyFeatures: string[];
      activities: string[];
    }

    interface ClimateData {
      title: string;
      description: string;
      seasonalCharacteristics: SeasonalCharacteristic[];
    }

    interface NaturalWonder {
      id: number;
      name: string;
      category: string;
      description: string; // 2-3 sentences max
      detailedDescription: string;
      bestTime: string;
      bestLocations: string[];
      viewingTips: string[];
      scientificData: Record<string, string>; // e.g., { "Height": "100m", "Age": "1M years" }
      icon: string; // Lucide icon name
    }

    interface BiodiversityCategory {
      name: string;
      icon: string;
      description: string;
      statistics: Array<{ category: string; count: string; details: string }>;
      notableSpecies: Array<{ name: string; status: string; significance: string }>;
      threats: string[];
      conservationEfforts: string[];
    }

    interface EcosystemData {
      title: string;
      overview: string;
      conservationStatus: {
         protectedAreas: string; // e.g. "15%"
         nationalParks: number;
      };
      biodiversityCategories: BiodiversityCategory[];
    }

    interface Activity {
      name: string;
      difficulty: string; // Easy, Moderate, Hard, Expert
      season: string;
      duration: string;
      description: string;
      bestLocations: string[];
      requirements: string;
      safety: string;
    }

    interface ActivityCategory {
      name: string; // e.g. "Hiking", "Water Sports"
      icon: string;
      description: string;
      activities: Activity[];
    }
    
    interface ActivitiesData {
        title: string;
        description: string;
        activityCategories: ActivityCategory[];
         essentialPlanning: {
            clothing: {
              summer: string;
              winter: string;
              yearRound: string;
            };
            equipment: {
              basic: string;
              hiking: string;
              photography: string;
            };
            safety: string[];
          };
    }

    interface CountryData {
      name: string; // "${country}"
      region: string; // e.g. "South America"
      description: string;
      quickFacts: QuickFact[];
      climateData: ClimateData;
      naturalWonders: NaturalWonder[];
      ecosystemData: EcosystemData;
      activities: ActivitiesData;
    }
    
    CRITICAL INSTRUCTIONS:
    1. Output strictly JSON. No markdown formatting like \`\`\`json.
    2. Be descriptive and extensive. "Beautiful and detailed" means rich text descriptions.
    3. Ensure realistic data for ${country}.
    4. For icons, strictly use names like: Mountain, Droplets, Thermometer, Wind, Trees, MapPin, Globe, Sun, Cloud, Snowflake, Compass, Waves, Leaf, Bird, Fish, Zap, Flame, Coffee, Navigation, Calendar, Clock, Users, Eye, ArrowRight.
    
    JSON Output:
  `;

    return await generateWithModel(genAI, MODEL_NAME, prompt);
}

async function main() {
    console.log('Starting Geography Data Generation...');
    const genAI = new GoogleGenerativeAI(API_KEY);

    // Sort alphabetically to be safe
    const sortedCountries = [...COUNTRIES].sort();

    for (const country of sortedCountries) {
        const slug = toKebabCase(country);
        const outFile = path.join(OUTPUT_DIR, `${slug}.json`);

        if (fs.existsSync(outFile)) {
            try {
                const content = fs.readFileSync(outFile, 'utf8');
                if (content.trim().length > 0) {
                    JSON.parse(content);
                    console.log(`Skipping ${country} (already exists)`);
                    continue;
                }
            } catch (e) {
                console.log(`Re-generating ${country} (invalid existing file)`);
            }
        }

        console.log(`Generating geography data for ${country}...`);
        const data = await generateCountryGeography(country, genAI);

        if (data) {
            fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
            console.log(`[SUCCESS] Saved ${slug}.json`);
        } else {
            console.error(`[FAILURE] Failed to generate data for ${country}`);
        }

        // Rate limiting precaution
        await delay(2000);
    }
}

main();
