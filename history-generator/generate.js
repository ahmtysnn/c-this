const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// YOUR API KEY HERE
const API_KEY = "AIzaSyB-LLGy6ZKwLp2eOupBwVAqspZpGWAuCx4";

const genAI = new GoogleGenerativeAI(API_KEY);

// List of countries to generate
const COUNTRIES = [
  'Turkey',
  'Mexico', 
  'United States',
  'France',
  'Japan',
  'Egypt',
  'Italy',
  'Greece',
  'China',
  'India',
  'Brazil',
  'Germany',
  'Spain',
  'United Kingdom',
  'Russia',
  'Canada',
  'Australia',
  'Argentina',
  'South Korea',
  'Iran'
];

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
    console.log('\n⚠️  Falling back to gemini-pro...\n');
    return 'gemini-pro';
  }
}

async function generateCountryHistory(countryName, modelName) {
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      responseMimeType: "application/json", // Force JSON response
    }
  });

  const prompt = `Generate historical data for ${countryName} as a valid JSON object.

CRITICAL: Use ONLY double quotes for strings. Never use single quotes or apostrophes inside text - replace with alternative phrasing.

{
  "name": "${countryName}",
  "officialName": "Full official name",
  "heroImage": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600",
  "historicalContext": {
    "geographicalFoundations": "2-3 paragraphs about geography and its impact on history",
    "civilizationalSignificance": "2-3 paragraphs about importance in world history",
    "worldHistoricalContributions": "2-3 paragraphs about contributions to humanity"
  },
  "historicalPeriods": [
    {
      "period": "Period Name (dates)",
      "scholarlyDesignation": "Academic name",
      "chronologicalFramework": "How historians divide this era",
      "keyDevelopments": [
        "Development 1",
        "Development 2",
        "Development 3"
      ],
      "archaeologicalEvidence": [
        "Site or finding 1",
        "Site or finding 2"
      ],
      "scholarlyDebates": [
        "Debate topic 1",
        "Debate topic 2"
      ],
      "historicalSignificance": "2 paragraphs on significance",
      "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"
    }
  ],
  "historicalAnalysis": {
    "demographicHistory": {
      "ancientPopulation": "1 paragraph",
      "medievalChanges": "1 paragraph",
      "modernTrends": "1 paragraph"
    },
    "economicSystems": {
      "traditional": "1 paragraph",
      "industrialization": "1 paragraph",
      "contemporary": "1 paragraph"
    },
    "intellectualHistory": {
      "ancientThought": "1 paragraph",
      "scholarlyDevelopment": "1 paragraph",
      "modernContributions": "1 paragraph"
    }
  },
  "majorDebates": [
    {
      "topic": "Debate topic",
      "positions": [
        "Position 1",
        "Position 2"
      ],
      "evidence": "Evidence types used"
    }
  ],
  "primarySources": {
    "ancient": ["Source 1 (date)", "Source 2 (date)"],
    "medieval": ["Source 1 (date)", "Source 2 (date)"],
    "modern": ["Source 1 (date)", "Source 2 (date)"]
  },
  "scholarlyFigures": {
    "ancient": ["Figure 1 (dates) - description", "Figure 2 (dates) - description"],
    "medieval": ["Figure 1 (dates) - description", "Figure 2 (dates) - description"],
    "modern": ["Figure 1 (dates) - description", "Figure 2 (dates) - description"]
  }
}

Create 5-6 historical periods. Keep text concise but informative.`;

  console.log(`   🤖 Calling Gemini API for ${countryName}...`);
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Save raw response for debugging
    const debugDir = path.join(__dirname, 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const slug = countryName.toLowerCase().replace(/\s+/g, '-');
    fs.writeFileSync(
      path.join(debugDir, `${slug}-raw.txt`), 
      text
    );
    
    // Clean up response - simpler approach for JSON mode
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
      console.log(`   ✅ JSON parsed successfully`);
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
    console.log(`   ❌ Generation/parsing failed: ${error.message}`);
    throw error;
  }
}

async function generateAllHistories() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📚 Country History Generator v1.1');
  console.log('   Using Google Gemini API (FREE)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // First, check available models
  const modelName = await listAvailableModels();

  console.log(`📋 Generating history for ${COUNTRIES.length} countries...`);
  console.log('');

  // Create output directory
  const outputDir = path.join(__dirname, 'history-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const index = {
    countries: [],
    lastUpdated: new Date().toISOString().split('T')[0],
    totalCountries: COUNTRIES.length
  };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < COUNTRIES.length; i++) {
    const country = COUNTRIES[i];
    const slug = country.toLowerCase().replace(/\s+/g, '-');
    
    try {
      console.log(`\n[${i + 1}/${COUNTRIES.length}] 📚 ${country}`);
      console.log(`   ⏳ Generating...`);
      
      const historyData = await generateCountryHistory(country, modelName);
      
      const filename = `${slug}.json`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(historyData, null, 2));
      
      // Add to index
      index.countries.push({
        name: country,
        slug: slug,
        url: `https://yourusername.github.io/country-history-data/${filename}`
      });
      
      const fileSize = (fs.statSync(filepath).size / 1024).toFixed(2);
      console.log(`   ✅ Saved: ${filename} (${fileSize} KB)`);
      successCount++;
      
      // Wait 2 seconds between requests (rate limiting)
      if (i < COUNTRIES.length - 1) {
        console.log(`   ⏸️  Waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
      
      // Save error details for debugging
      const errorFile = path.join(outputDir, `${slug}-error.txt`);
      fs.writeFileSync(errorFile, `${error.message}\n\n${error.stack || ''}`);
    }
  }

  // Save index.json
  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Generation Complete!');
  console.log(`   ✅ Success: ${successCount}/${COUNTRIES.length}`);
  console.log(`   ❌ Failed: ${failCount}/${COUNTRIES.length}`);
  console.log(`   📁 Output: ${outputDir}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📤 Next Steps:');
  console.log('   1. Review generated JSON files in history-data/');
  console.log('   2. Create GitHub repository: country-history-data');
  console.log('   3. Upload all files from history-data/ folder');
  console.log('   4. Enable GitHub Pages');
  console.log('   5. Update backend with your GitHub Pages URL');
  console.log('');
}

// Run the generator
generateAllHistories().catch(console.error);