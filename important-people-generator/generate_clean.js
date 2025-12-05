import { COUNTRIES } from './countries.js';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in the root directory
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// YOUR API KEY HERE
const API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);

// List of countries to generate historical figures for
// const COUNTRIES = [
//   'Turkey',
//   'Mexico', 
//   'United States',
//   'France',
//   'Japan',
//   'Egypt',
//   'Italy',
//   'Greece',
//   'China',
//   'India',
//   'Brazil',
//   'Germany',
//   'Spain',
//   'United Kingdom',
//   'Russia',
//   'Canada',
//   'Australia',
//   'Argentina',
//   'South Korea',
//   'Iran'
// ];

// Function to list available models
async function listAvailableModels() {
  try {
    console.log('🔍 Checking available models...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('\n📋 Available models:');
    const generativeModels = data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));

    generativeModels.forEach(model => {
      console.log(`   • ${model}`);
    });

    // Return the first suitable model
    const preferredModels = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-1.0-pro'
    ];

    for (const preferred of preferredModels) {
      if (generativeModels.includes(preferred)) {
        console.log(`\n✅ Using model: ${preferred}\n`);
        return preferred;
      }
    }

    // If none of the preferred models found, use first available
    if (generativeModels.length > 0) {
      console.log(`\n✅ Using model: ${generativeModels[0]}\n`);
      return generativeModels[0];
    }

    throw new Error('No suitable generative models found');

  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    console.log('\n⚠️  Falling back to gemini-1.5-flash...\n');
    return 'gemini-1.5-flash';
  }
}

async function generateHistoricalFigures(countryName, modelName, retryCount = 0) {
  const maxRetries = 3;

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      responseMimeType: "application/json",
    }
  });

  const prompt = `Generate data for 15-20 most important historical figures from ${countryName} as a valid JSON object.

CRITICAL: Use ONLY double quotes for strings. Never use single quotes or apostrophes inside text - replace with alternative phrasing or use unicode characters.

Select diverse figures from ALL these categories:
- LEADERS: Emperors, kings, presidents, prime ministers, revolutionaries (4-5 figures)
- MILITARY: Generals, admirals, warriors, resistance fighters (2-3 figures)  
- INTELLECTUALS: Philosophers, scientists, mathematicians, inventors (3-4 figures)
- ARTISTS: Writers, poets, painters, musicians, architects (3-4 figures)
- RELIGIOUS: Religious leaders, saints, spiritual figures (1-2 figures)
- REFORMERS: Social activists, reformers, civil rights leaders (2-3 figures)

Include figures from ALL historical periods:
- Ancient period (if applicable)
- Medieval period
- Early modern period  
- Modern period (19th-20th century)
- Contemporary (if deceased and historically significant)

MUST include:
- At least 3-4 women (more if country has many significant women)
- Figures from minority groups when historically significant
- Both celebrated and controversial figures
- Mix of military, cultural, scientific, and political figures

{
  "country": "${countryName}",
  "historicalFigures": [
    {
      "id": 1,
      "name": "Full name in English",
      "nativeName": "Name in native script/language",
      "lifespan": "YYYY-YYYY or c. YYYY-c. YYYY",
      "era": "Historical period/era name",
      "role": "Primary role (e.g., Emperor, Poet, General, Scientist)",
      "background": "2-3 paragraphs about their life, upbringing, education, and how they rose to prominence. Include family background, early influences, and formative experiences.",
      "keyDecisions": [
        "Major decision or action 1 with context",
        "Major decision or action 2 with context",
        "Major decision or action 3 with context",
        "Major decision or action 4 with context"
      ],
      "achievements": [
        "Major achievement 1 with specific details",
        "Major achievement 2 with specific details",
        "Major achievement 3 with specific details",
        "Major achievement 4 with specific details"
      ],
      "challenges": [
        "Major challenge or obstacle 1",
        "Major challenge or obstacle 2",
        "Major challenge or obstacle 3",
        "Major challenge or obstacle 4"
      ],
      "legacy": "2-3 paragraphs about lasting impact on history, culture, and society. How they are remembered today and why they matter.",
      "quotes": [
        "Famous quote 1 (avoid apostrophes, use unicode or rephrase)",
        "Famous quote 2 (avoid apostrophes, use unicode or rephrase)",
        "Famous quote 3 (avoid apostrophes, use unicode or rephrase)"
      ],
      "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      "significance": "1-2 sentences explaining their unique importance in history",
      "culturalImpact": "1-2 paragraphs about influence on arts, literature, popular culture, national identity, and modern society",
      "primarySources": [
        "Primary source 1 (title, date, type)",
        "Primary source 2 (title, date, type)",
        "Primary source 3 (title, date, type)",
        "Primary source 4 (title, date, type)"
      ],
      "modernInterpretations": [
        "Modern scholarly view 1",
        "Modern scholarly view 2",
        "Modern scholarly view 3"
      ]
    }
  ]
}

Requirements:
- Select 15-20 diverse figures (aim for 18 for best coverage)
- Include figures from ALL time periods available in country history
- Include figures from ALL categories listed above
- Provide specific, factual information
- Keep each paragraph 100-150 words
- Each list should have 3-4 items minimum
- Focus on accuracy and historical significance
- Include at least 3-4 women (more if the country has many significant women in history)
- Represent different aspects: politics, military, culture, science, religion, social reform`;

  console.log(`   🤖 Calling Gemini API for ${countryName}...`);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Save raw response for debugging
    const debugDir = path.join(__dirname, 'debug-people');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const slug = countryName.toLowerCase().replace(/\s+/g, '-');
    fs.writeFileSync(
      path.join(debugDir, `${slug}-raw.txt`),
      text
    );

    // Clean up response
    text = text.trim();

    // Remove markdown code blocks if present
    text = text.replace(/```json\s*/g, '');
    text = text.replace(/```\s*/g, '');

    // Find the JSON object boundaries
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    // Save cleaned JSON for debugging
    fs.writeFileSync(
      path.join(debugDir, `${slug}-cleaned.txt`),
      text
    );

    // Try to parse
    let parsed;
    try {
      parsed = JSON.parse(text);
      const count = parsed.historicalFigures?.length || 0;
      console.log(`   ✅ JSON parsed successfully - ${count} figures`);

      // Warn if too few figures
      if (count < 12) {
        console.log(`   ⚠️  Warning: Only ${count} figures generated (expected 15-20)`);
      }
    } catch (parseError) {
      console.log(`   ⚠️  Parse failed: ${parseError.message}`);

      // Save error details
      const errorPos = parseError.message.match(/position (\d+)/);
      if (errorPos) {
        const pos = parseInt(errorPos[1]);
        const context = text.substring(Math.max(0, pos - 150), Math.min(text.length, pos + 150));
        console.log(`   📍 Error context: ...${context}...`);

        fs.writeFileSync(
          path.join(debugDir, `${slug}-error-context.txt`),
          `Error at position ${pos}:\n\n${context}\n\nFull error: ${parseError.message}`
        );
      }

      throw parseError;
    }

    return parsed;

  } catch (error) {
    // Check if it's a rate limit error
    if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate')) {
      if (retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 60000; // 1min, 2min, 4min
        console.log(`   ⚠️  Rate limit hit. Waiting ${waitTime / 60000} minute(s) before retry ${retryCount + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateHistoricalFigures(countryName, modelName, retryCount + 1);
      } else {
        console.log(`   ❌ Max retries reached. Try again later.`);
      }
    }

    console.log(`   ❌ Generation/parsing failed: ${error.message}`);
    throw error;
  }
}

async function generateAllHistoricalFigures() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('👥 Historical Figures Generator v2.0');
  console.log('   Generating 15-20 figures per country');
  console.log('   Using Google Gemini API (FREE)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // const modelName = await listAvailableModels();
  const modelName = 'gemini-2.0-flash-lite';
  console.log(`   ℹ️  Skipping model check, using: ${modelName}`);

  console.log(`📋 Generating historical figures for ${COUNTRIES.length} countries...`);
  console.log('');

  // Create output directory
  const outputDir = path.join(__dirname, 'people-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const indexPath = path.join(outputDir, 'index.json');
  let index;
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      console.log(`   📊 Loaded existing index with ${index.countries.length} countries.`);
    } catch (e) {
      console.log(`   ⚠️  Error reading existing index, creating new one.`);
    }
  }

  if (!index) {
    index = {
      countries: [],
      lastUpdated: new Date().toISOString().split('T')[0],
      totalCountries: COUNTRIES.length,
      totalFigures: 0
    };
  }

  let successCount = 0;
  let failCount = 0;
  let totalFigures = 0;

  let countriesToProcess = COUNTRIES;
  const targetCountry = process.argv[2];
  if (targetCountry) {
    countriesToProcess = COUNTRIES.filter(c => c === targetCountry);
    if (countriesToProcess.length === 0) {
      console.error(`Country '${targetCountry}' not found in list.`);
      process.exit(1);
    }
    console.log(`🎯 Targeting single country: ${targetCountry}`);
  }

  for (let i = 0; i < countriesToProcess.length; i++) {
    const country = countriesToProcess[i];
    const slug = country.toLowerCase().replace(/\s+/g, '-');

    // Skip if already generated
    const filename = `${slug}-people.json`;
    const filepath = path.join(outputDir, filename);
    if (fs.existsSync(filepath)) {
      console.log(`\n[${i + 1}/${countriesToProcess.length}] ⏭️  ${country}`);
      console.log(`   ✓ Already exists, skipping...`);

      // Update index
      const existingData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      const figureCount = existingData.historicalFigures?.length || 0;
      const existingEntryIndex = index.countries.findIndex(c => c.slug === slug);
      const newEntry = {
        name: country,
        slug: slug,
        figureCount: figureCount,
        url: `https://yourusername.github.io/people-data/${filename}`
      };

      if (existingEntryIndex !== -1) {
        index.countries[existingEntryIndex] = newEntry;
      } else {
        index.countries.push(newEntry);
      }
      successCount++;
      continue;
    }

    try {
      console.log(`\n[${i + 1}/${countriesToProcess.length}] 👥 ${country}`);
      console.log(`   ⏳ Generating...`);

      const figuresData = await generateHistoricalFigures(country, modelName);

      const filename = `${slug}-people.json`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(figuresData, null, 2));

      const figureCount = figuresData.historicalFigures?.length || 0;
      totalFigures += figureCount;

      // Update index
      const existingEntryIndex = index.countries.findIndex(c => c.slug === slug);
      const newEntry = {
        name: country,
        slug: slug,
        figureCount: figureCount,
        url: `https://yourusername.github.io/people-data/${filename}`
      };

      if (existingEntryIndex !== -1) {
        index.countries[existingEntryIndex] = newEntry;
      } else {
        index.countries.push(newEntry);
      }

      const fileSize = (fs.statSync(filepath).size / 1024).toFixed(2);
      console.log(`   ✅ Saved: ${filename} (${fileSize} KB, ${figureCount} figures)`);
      successCount++;

      // Wait between requests (rate limiting)
      if (i < countriesToProcess.length - 1) {
        const waitTime = 10000; // 10 seconds
        console.log(`   ⏸️  Waiting ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;

      // Save error details for debugging
      const errorFile = path.join(outputDir, `${slug}-error.txt`);
      fs.writeFileSync(errorFile, `${error.message}\n\n${error.stack || ''}`);
    }
  }

  // Update total figures in index
  index.totalFigures = index.countries.reduce((sum, c) => sum + (c.figureCount || 0), 0);

  // Save index.json
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Generation Complete!');
  console.log(`   ✅ Success: ${successCount}/${COUNTRIES.length}`);
  console.log(`   ❌ Failed: ${failCount}/${COUNTRIES.length}`);
  console.log(`   👥 Total Figures: ${totalFigures}`);
  console.log(`   📁 Output: ${outputDir}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📤 Next Steps:');
  console.log('   1. Review generated JSON files in people-data/');
  console.log('   2. Create GitHub repository: country-people-data');
  console.log('   3. Upload all files from people-data/ folder');
  console.log('   4. Enable GitHub Pages');
  console.log('   5. Update frontend with your GitHub Pages URL');
  console.log('');
  console.log('💡 Example usage in frontend:');
  console.log('   fetch("https://yourusername.github.io/people-data/turkey-people.json")');
  console.log('     .then(res => res.json())');
  console.log('     .then(data => setHistoricalFigures(data.historicalFigures))');
  console.log('');
}

// Run the generator
generateAllHistoricalFigures().catch(console.error);
