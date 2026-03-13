/**
 * Quick script to query Atlas Cloud for available image models.
 * Run: node scripts/check-atlas-models.mjs
 */
const ATLAS_KEY = process.env.ATLAS_API_KEY;
if (!ATLAS_KEY) {
  console.error("ATLAS_API_KEY not set");
  process.exit(1);
}

async function main() {
  console.log("Querying Atlas Cloud models...");
  
  // Try /v1/models endpoint
  try {
    const res = await fetch("https://api.atlascloud.ai/v1/models", {
      headers: { Authorization: `Bearer ${ATLAS_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      const models = data.data || data;
      console.log(`\nFound ${Array.isArray(models) ? models.length : '?'} models.`);
      
      // Filter for image-related models
      const imageModels = (Array.isArray(models) ? models : []).filter(m => {
        const id = (m.id || m.name || '').toLowerCase();
        return id.includes('image') || id.includes('nano') || id.includes('banana') || 
               id.includes('gemini-3') || id.includes('dall') || id.includes('flux') ||
               id.includes('vision') || id.includes('gpt-image');
      });
      
      if (imageModels.length > 0) {
        console.log("\n=== Image-related models ===");
        imageModels.forEach(m => console.log(`  - ${m.id || m.name}`));
      }
      
      // Also print all models for reference
      console.log("\n=== All models ===");
      (Array.isArray(models) ? models : []).forEach(m => console.log(`  - ${m.id || m.name}`));
    } else {
      console.log(`Models endpoint returned ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("Failed to query models:", err.message);
  }

  // Also try specific model names to see which ones work
  const candidates = [
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-3-pro-image-preview",
    "google/gemini-2.0-flash-exp",
    "google/gemini-2.0-flash-preview-image-generation",
    "google/imagen-3",
    "google/imagen-3.0-generate-002",
    "openai/gpt-image-1-developer",
    "openai/dall-e-3",
  ];

  console.log("\n=== Testing model availability ===");
  for (const model of candidates) {
    try {
      const res = await fetch("https://api.atlascloud.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ATLAS_KEY}`,
        },
        body: JSON.stringify({
          model,
          prompt: "A simple red circle on white background",
          n: 1,
          response_format: "b64_json",
        }),
      });
      const text = await res.text();
      const status = res.status;
      const hasData = text.includes('"data"') && !text.includes('"data":[]');
      console.log(`  ${model}: ${status} ${hasData ? '✅ HAS DATA' : '❌ ' + text.substring(0, 100)}`);
    } catch (err) {
      console.log(`  ${model}: ❌ ${err.message}`);
    }
  }
}

main();
