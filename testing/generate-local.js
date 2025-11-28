const fs = require('fs');
const path = require('path');

// Ollama Configuration
const OLLAMA_CONFIG = {
  host: 'http://localhost:11434',
  model: 'llama3.2:3b',
  temperature: 0.3,
  num_predict: 6000,
};

// List of countries to generate historical figures for
const COUNTRIES = [
  'Turkey', 'Mexico', 'United States', 'France', 'Japan', 'Egypt', 
  'Italy', 'Greece', 'China', 'India', 'Brazil', 'Germany', 
  'Spain', 'United Kingdom', 'Russia', 'Canada', 'Australia', 
  'Argentina', 'South Korea', 'Iran'
];

// API Usage Tracker
const apiUsage = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  responseTimes: []
};

// IMPROVED: Smart JSON cleaning that preserves URLs
function smartCleanJSON(text) {
  // Remove markdown
  text = text.replace(/```json\s*/gi, '');
  text = text.replace(/```\s*/g, '');
  
  // Extract JSON object
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return text;
  text = text.substring(firstBrace);
  
  // Find matching closing brace
  let depth = 0;
  let endPos = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        endPos = i;
        break;
      }
    }
  }
  
  if (endPos > 0) {
    text = text.substring(0, endPos + 1);
  }
  
  // Step 1: Temporarily protect URLs by replacing them with placeholders
  const urlPlaceholders = [];
  text = text.replace(/"(https?:\/\/[^"]+)"/g, (match, url) => {
    const placeholder = `__URL_${urlPlaceholders.length}__`;
    urlPlaceholders.push(url);
    return `"${placeholder}"`;
  });
  
  // Step 2: Remove control characters (but URLs are safe now)
  text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  
  // Step 3: Clean up the rest
  text = text
    // Remove comments
    .replace(/\/\/.*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Fix trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Normalize whitespace (but not inside strings)
    .replace(/\s+/g, ' ')
    .trim();
  
  // Step 4: Restore URLs
  urlPlaceholders.forEach((url, index) => {
    const placeholder = `__URL_${index}__`;
    text = text.replace(placeholder, url);
  });
  
  return text;
}

// ALTERNATIVE: Try to fix common JSON issues
function fixCommonJSONIssues(text) {
  // Fix incomplete URLs - add a default image if URL is broken
  text = text.replace(/"image":\s*"https?:?"?\s*,?/g, 
    '"image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",');
  
  // Fix unterminated strings at the end of lines
  text = text.replace(/"\s*\n/g, '",\n');
  
  // Ensure proper comma placement in arrays
  text = text.replace(/"\s*\n\s*"/g, '", "');
  
  // Remove any remaining backslashes
  text = text.replace(/\\/g, '');
  
  return text;
}

// ULTRA SAFE: Parse with multiple fallback strategies
function ultraSafeParseJSON(text) {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch (e1) {
    console.log('   🔧 Strategy 1 failed, trying strategy 2...');
  }
  
  // Strategy 2: Apply smart cleaning
  try {
    const cleaned = smartCleanJSON(text);
    return JSON.parse(cleaned);
  } catch (e2) {
    console.log('   🔧 Strategy 2 failed, trying strategy 3...');
  }
  
  // Strategy 3: Fix common issues + smart cleaning
  try {
    const fixed = fixCommonJSONIssues(smartCleanJSON(text));
    return JSON.parse(fixed);
  } catch (e3) {
    console.log('   🔧 Strategy 3 failed, trying strategy 4...');
  }
  
  // Strategy 4: Nuclear option - strip everything problematic
  try {
    let nuclear = text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\\/g, '')
      .replace(/\s+/g, ' ')
      .replace(/,\s*([}\]])/g, '$1')
      // Fix broken URLs
      .replace(/"image":\s*"[^"]*"/g, '"image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"');
    
    return JSON.parse(nuclear);
  } catch (e4) {
    // All strategies failed
    throw new Error(`All parsing strategies failed. Last error: ${e4.message}`);
  }
}

// Function to call Ollama API
async function callOllama(prompt, retryCount = 0) {
  const maxRetries = 2;
  const startTime = Date.now();
  
  try {
    console.log(`   📡 Calling Ollama (${OLLAMA_CONFIG.model})...`);
    
    const response = await fetch(`${OLLAMA_CONFIG.host}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.model,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: OLLAMA_CONFIG.temperature,
          num_predict: OLLAMA_CONFIG.num_predict,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    apiUsage.responseTimes.push(responseTime);
    apiUsage.averageResponseTime = apiUsage.responseTimes.reduce((a, b) => a + b, 0) / apiUsage.responseTimes.length;
    
    console.log(`   ⏱️  Response time: ${(responseTime / 1000).toFixed(2)}s`);
    
    return data.response;
    
  } catch (error) {
    if (retryCount < maxRetries) {
      const waitTime = 3000;
      console.log(`   ⚠️  Error occurred. Retrying in ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callOllama(prompt, retryCount + 1);
    }
    throw error;
  }
}

async function generateHistoricalFigures(countryName, attemptNumber = 1) {
  const maxAttempts = 3;
  
  try {
    // SIMPLIFIED PROMPT: Don't ask for image URLs, we'll add them after
    const prompt = `Generate valid JSON with 8 historical figures from ${countryName}.

CRITICAL RULES:
- Output ONLY valid JSON, nothing else
- NO special characters, NO newlines in strings
- Keep text simple and SHORT
- Do NOT include "image" field - we will add it later
- Use simple quotes and apostrophes only

Structure:
{
  "country": "${countryName}",
  "historicalFigures": [
    {
      "id": 1,
      "name": "Full Name",
      "nativeName": "Native name",
      "lifespan": "YYYY-YYYY",
      "era": "Period",
      "role": "Role",
      "background": "Short sentence about early life",
      "keyDecisions": ["Decision 1", "Decision 2", "Decision 3"],
      "achievements": ["Achievement 1", "Achievement 2", "Achievement 3"],
      "challenges": ["Challenge 1", "Challenge 2"],
      "legacy": "Short sentence about impact",
      "quotes": ["Quote 1", "Quote 2"],
      "significance": "Why they matter",
      "culturalImpact": "Cultural influence"
    }
  ]
}

Mix: 2 politicians, 2 military, 2 intellectuals, 2 artists. Include 1 woman minimum.`;

    apiUsage.totalRequests++;
    
    const response = await callOllama(prompt);
    
    // Save raw response
    const debugDir = path.join(__dirname, 'debug-people');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const slug = countryName.toLowerCase().replace(/\s+/g, '-');
    fs.writeFileSync(
      path.join(debugDir, `${slug}-attempt${attemptNumber}-raw.txt`), 
      response
    );
    
    console.log(`   🧹 Cleaning and parsing JSON...`);
    
    // Try to parse with all strategies
    let parsed;
    try {
      parsed = ultraSafeParseJSON(response);
    } catch (parseError) {
      console.log(`   ❌ All parsing strategies failed: ${parseError.message}`);
      
      // Save the problematic JSON for inspection
      fs.writeFileSync(
        path.join(debugDir, `${slug}-attempt${attemptNumber}-failed.txt`), 
        response
      );
      
      if (attemptNumber < maxAttempts) {
        console.log(`   🔄 Retry attempt ${attemptNumber + 1}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return generateHistoricalFigures(countryName, attemptNumber + 1);
      }
      throw parseError;
    }
    
    // Validate structure
    if (!parsed.country || !Array.isArray(parsed.historicalFigures)) {
      throw new Error('Invalid JSON structure: missing required fields');
    }
    
    // Add default image to all figures and clean data
    const defaultImage = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800";
    parsed.historicalFigures = parsed.historicalFigures
      .filter(fig => fig && fig.name && fig.role && fig.lifespan)
      .map(fig => ({
        ...fig,
        image: fig.image || defaultImage,
        // Clean any remaining problematic text
        quotes: Array.isArray(fig.quotes) ? fig.quotes.map(q => 
          String(q).replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim()
        ) : [],
        keyDecisions: Array.isArray(fig.keyDecisions) ? fig.keyDecisions.map(d => 
          String(d).replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim()
        ) : [],
        achievements: Array.isArray(fig.achievements) ? fig.achievements.map(a => 
          String(a).replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim()
        ) : [],
        challenges: Array.isArray(fig.challenges) ? fig.challenges.map(c => 
          String(c).replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim()
        ) : []
      }));
    
    const count = parsed.historicalFigures.length;
    console.log(`   ✅ Success! Parsed ${count} valid figures`);
    
    if (count < 4) {
      throw new Error(`Too few figures generated: ${count}`);
    }
    
    // Save cleaned version
    fs.writeFileSync(
      path.join(debugDir, `${slug}-attempt${attemptNumber}-success.json`), 
      JSON.stringify(parsed, null, 2)
    );
    
    apiUsage.successfulRequests++;
    return parsed;
    
  } catch (error) {
    apiUsage.failedRequests++;
    console.log(`   ❌ Failed: ${error.message}`);
    
    if (attemptNumber < maxAttempts) {
      console.log(`   🔄 Retry attempt ${attemptNumber + 1}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return generateHistoricalFigures(countryName, attemptNumber + 1);
    }
    
    throw error;
  }
}

function displayApiStats() {
  console.log('\n📊 Statistics:');
  console.log('═══════════════════════════════════');
  console.log(`Total Requests: ${apiUsage.totalRequests}`);
  console.log(`Successful: ${apiUsage.successfulRequests}`);
  console.log(`Failed: ${apiUsage.failedRequests}`);
  if (apiUsage.averageResponseTime > 0) {
    console.log(`Avg Response: ${(apiUsage.averageResponseTime / 1000).toFixed(2)}s`);
  }
  console.log(`Model: ${OLLAMA_CONFIG.model}`);
}

async function checkOllamaStatus() {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.host}/api/tags`);
    if (!response.ok) {
      throw new Error('Ollama not responding');
    }
    const data = await response.json();
    
    console.log('Available models:');
    data.models.forEach(m => console.log(`   - ${m.name}`));
    
    const modelExists = data.models.some(m => m.name === OLLAMA_CONFIG.model);
    
    if (!modelExists) {
      console.log(`\n⚠️  Model '${OLLAMA_CONFIG.model}' not found!`);
      console.log(`\nRecommendation: Use llama3.2:3b for better JSON generation`);
      console.log(`Run: ollama pull llama3.2:3b`);
      throw new Error(`Model not available`);
    }
    
    console.log(`\n✅ Using: ${OLLAMA_CONFIG.model}`);
    return true;
  } catch (error) {
    console.error(`\n❌ Cannot connect to Ollama at ${OLLAMA_CONFIG.host}`);
    console.error('   Make sure Ollama is running: ollama serve');
    throw error;
  }
}

async function generateAllHistoricalFigures() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('👥 Historical Figures Generator - Ollama Edition');
  console.log('═══════════════════════════════════════════════════════\n');

  await checkOllamaStatus();
  console.log(`\n📋 Generating for ${COUNTRIES.length} countries\n`);

  const outputDir = path.join(__dirname, 'people-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const index = {
    countries: [],
    lastUpdated: new Date().toISOString(),
    totalCountries: COUNTRIES.length,
    totalFigures: 0,
    model: OLLAMA_CONFIG.model
  };

  let successCount = 0;
  let failCount = 0;
  let totalFigures = 0;

  for (let i = 0; i < COUNTRIES.length; i++) {
    const country = COUNTRIES[i];
    const slug = country.toLowerCase().replace(/\s+/g, '-');
    const filename = `${slug}-people.json`;
    const filepath = path.join(outputDir, filename);
    
    // Skip existing
    if (fs.existsSync(filepath)) {
      console.log(`\n[${i + 1}/${COUNTRIES.length}] ⏭️  ${country} (already exists)`);
      try {
        const existingData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const figureCount = existingData.historicalFigures?.length || 0;
        totalFigures += figureCount;
        index.countries.push({ name: country, slug, figureCount, filename });
        successCount++;
      } catch (e) {
        console.log(`   ⚠️  Corrupted file, will regenerate`);
        fs.unlinkSync(filepath);
        i--;
      }
      continue;
    }
    
    try {
      console.log(`\n[${i + 1}/${COUNTRIES.length}] 👥 ${country}`);
      
      const figuresData = await generateHistoricalFigures(country);
      
      fs.writeFileSync(filepath, JSON.stringify(figuresData, null, 2));
      
      const figureCount = figuresData.historicalFigures.length;
      totalFigures += figureCount;
      
      index.countries.push({ name: country, slug, figureCount, filename });
      
      const fileSize = (fs.statSync(filepath).size / 1024).toFixed(1);
      console.log(`   💾 Saved: ${filename} (${fileSize} KB, ${figureCount} figures)`);
      successCount++;
      
      // Delay between requests
      if (i < COUNTRIES.length - 1) {
        console.log(`   ⏸️  Waiting 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failCount++;
      
      try {
        fs.writeFileSync(
          path.join(outputDir, `${slug}-error.txt`),
          `${error.message}\n\n${error.stack || ''}`
        );
      } catch (e) {}
    }
    
    if ((i + 1) % 5 === 0) {
      displayApiStats();
    }
  }

  index.totalFigures = totalFigures;
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2));
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 Complete!');
  console.log(`   ✅ Success: ${successCount}/${COUNTRIES.length}`);
  console.log(`   ❌ Failed: ${failCount}/${COUNTRIES.length}`);
  console.log(`   👥 Total Figures: ${totalFigures}`);
  displayApiStats();
  console.log('═══════════════════════════════════════════════════════');
  
  if (failCount > 0) {
    console.log('\n💡 TIP: Check debug-people folder for failed attempts');
  }
}

generateAllHistoricalFigures().catch(console.error);