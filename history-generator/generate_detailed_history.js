const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { COUNTRIES } = require('../countries');

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'history-data-new');
const API_KEY = process.env.GEMINI_API_KEY;
// Use Gemma 3 4B as primary, fallback to others if needed
const MODEL_CANDIDATES = ['gemma-3-4b-it', 'gemini-1.5-flash'];

if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY not found');
  process.exit(1);
}
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const toKebabCase = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/-+$/, '');
const getExistingCountries = () => new Set(fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- API HELPER ---
const callApi = (model, prompt) => {
  return new Promise((resolve, reject) => {
    const modelName = model.startsWith('models/') ? model : `models/${model}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${API_KEY}`;
    const postData = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });

    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            if (json.candidates?.[0]?.content) {
              resolve(json.candidates[0].content.parts[0].text);
            } else {
              reject(new Error(`Invalid structure: ${data.substring(0, 100)}`));
            }
          } catch (e) {
            reject(new Error('JSON Parse error on API response'));
          }
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// --- GENERIC GENERATOR ---
const generateSection = async (countryName, sectionName, specificPrompt) => {
  console.log(`   > Generating ${sectionName}...`);
  for (const model of MODEL_CANDIDATES) {
    try {
      const result = await callApi(model, specificPrompt);
      let cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
      // Find outer braces if extra text exists
      const start = cleanJson.indexOf('{');
      const end = cleanJson.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanJson = cleanJson.substring(start, end + 1);

      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn(`     Retrying ${sectionName} with next model (${e.message})...`);
    }
  }
  throw new Error(`Failed to generate ${sectionName}`);
};

// --- PROMPTS ---

const PROMPT_CONTEXT = (country) => `
You are an expert historian. Write a **MASSIVE, DETAILED JSON object** for the "historicalContext" of **${country}**.
Each field must be a **MINI-ESSAY (300-500 words each)**. Do not summarize. Dive deep into geography, civilization, and global impact.

Output Structure (JSON ONLY):
{
  "geographicalFoundations": "Extremely detailed paragraph...",
  "civilizationalSignificance": "Extremely detailed paragraph...",
  "worldHistoricalContributions": "Extremely detailed paragraph..."
}
`;

const PROMPT_PERIOD_OUTLINE = (country) => `
List **8-12 distinct historical periods** for **${country}**.
Return a JSON object containing an array "periods".
Each period must have a "period" (title) and "chronologicalFramework" (dates).

Output Structure (JSON ONLY):
{
  "periods": [
    { "period": "Ancient Era", "chronologicalFramework": "3000 BCE - 500 BCE" },
    ...
  ]
}
`;

const PROMPT_PERIOD_DETAIL = (country, period, dates) => `
Write a **MASSIVE, EXTREME DETAILED JSON object** for the period "**${period}**" (${dates}) in **${country}**.
This is just ONE section of a larger history. Be exhaustive.

Requirements:
- "keyDevelopments": At least 8-10 specific bullet points.
- "scholarlyDebates": At least 3 detailed debates.
- "historicalSignificance": A substantial paragraph.

Output Structure (JSON ONLY):
{
  "period": "${period}",
  "scholarlyDesignation": "Academic Term",
  "chronologicalFramework": "${dates}",
  "keyDevelopments": ["Dev 1", "Dev 2", "Dev 3", "Dev 4", "Dev 5", "Dev 6", "Dev 7", "Dev 8"],
  "archaeologicalEvidence": ["Site A", "Artifact B"],
  "scholarlyDebates": ["Debate 1", "Debate 2", "Debate 3"],
  "historicalSignificance": "Deep analysis...",
  "image": "https://images.unsplash.com/..." 
}
`;

const PROMPT_ANALYSIS = (country) => `
Write a **MASSIVE, DETAILED JSON object** for the "historicalAnalysis" and "majorDebates" of **${country}**.
Fields like "demographicHistory" must be **OBJECTS** with sub-fields (ancient, medieval, modern), each being a **DETAILED PARAGRAPH**.

Output Structure (JSON ONLY):
{
  "historicalAnalysis": {
    "demographicHistory": { "ancientPopulation": "...", "medievalChanges": "...", "modernTrends": "..." },
    "economicSystems": { "traditional": "...", "industrialization": "...", "contemporary": "..." },
    "intellectualHistory": { "ancientThought": "...", "scholarlyDevelopment": "...", "modernContributions": "..." }
  },
  "majorDebates": [ { "topic": "...", "positions": ["...", "..."], "evidence": "..." } ],
  "primarySources": { "ancient": [], "medieval": [], "modern": [] },
  "scholarlyFigures": { "ancient": [], "medieval": [], "modern": [] }
}
`;

// --- MAIN ORCHESTRATOR ---
const generateFullHistory = async (country) => {
  console.log(`\n=== Generating MASSIVE history for: ${country} ===`);

  try {
    // 1. Context
    const context = await generateSection(country, 'Context', PROMPT_CONTEXT(country));

    // 2. Outline
    const outline = await generateSection(country, 'Period Outline', PROMPT_PERIOD_OUTLINE(country));

    // 3. Period Loop
    const periods = [];
    console.log(`   > expanding ${outline.periods.length} periods...`);
    for (const p of outline.periods) {
      const periodData = await generateSection(country, `Period: ${p.period}`, PROMPT_PERIOD_DETAIL(country, p.period, p.chronologicalFramework));
      periods.push(periodData);
      await delay(1000); // polite delay
    }

    // 4. Analysis
    const analysis = await generateSection(country, 'Analysis', PROMPT_ANALYSIS(country));

    // 5. Assembly
    const finalJson = {
      name: country,
      officialName: `The Nation of ${country}`, // Can be refined
      heroImage: `https://images.unsplash.com/photo-1?q=80&w=1080&auto=format&fit=crop&search=${country.replace(/ /g, '+')}`,
      historicalContext: context,
      historicalPeriods: periods,
      historicalAnalysis: analysis.historicalAnalysis,
      majorDebates: analysis.majorDebates,
      primarySources: analysis.primarySources,
      scholarlyFigures: analysis.scholarlyFigures
    };

    return finalJson;

  } catch (error) {
    console.error(`!!! Failed to complete ${country}:`, error.message);
    return null;
  }
};

const main = async () => {
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = parseInt(limitArg ? limitArg.split('=')[1] : '5');

  const startFromArg = process.argv.find(a => a.startsWith('--start-from='));
  const startFrom = startFromArg ? startFromArg.split('=')[1] : null;

  let targetCountries = COUNTRIES;

  // If start-from is provided, slice the requested portion of the list
  if (startFrom) {
    const startIndex = COUNTRIES.findIndex(c => c === startFrom);
    if (startIndex !== -1) {
      console.log(`\nResuming from: "${startFrom}" (Index ${startIndex})`);
      // Start checking from this country inclusive (it will be skipped later if it already exists)
      targetCountries = COUNTRIES.slice(startIndex);
    } else {
      console.warn(`\nWarning: Start country "${startFrom}" not found in list. Starting from beginning.`);
    }
  }

  const existing = getExistingCountries();
  // Only process countries that are (1) in our target slice and (2) missing from output
  const missing = targetCountries.filter(c => !existing.has(toKebabCase(c)));

  console.log(`Total Target Scope: ${targetCountries.length} countries`);
  console.log(`Actually Missing to Generate: ${missing.length}. Limit: ${limit}`);

  for (let i = 0; i < limit && i < missing.length; i++) {
    const country = missing[i];
    const data = await generateFullHistory(country);
    if (data) {
      const outPath = path.join(OUTPUT_DIR, `${toKebabCase(country)}.json`);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
      console.log(`   [SUCCESS] Saved ${toKebabCase(country)}.json (${(fs.statSync(outPath).size / 1024).toFixed(2)} KB)`);
    }
    await delay(2000);
  }
};

main();
