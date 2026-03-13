import 'dotenv/config';

const key = process.env.ATLAS_API_KEY;
if (!key) { console.error("No ATLAS_API_KEY"); process.exit(1); }

async function testImagesEndpoint(model) {
  console.log(`\n--- ${model} on /images/generations ---`);
  try {
    const r = await fetch('https://api.atlascloud.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt: 'A red apple on white background', n: 1, response_format: 'b64_json' }),
    });
    const t = await r.text();
    const hasData = t.includes('"data"') && !t.includes('"data":[]');
    console.log(`  Status: ${r.status} ${hasData ? 'HAS DATA' : t.substring(0, 150)}`);
    return hasData;
  } catch(e) { console.log(`  Error: ${e.message}`); return false; }
}

async function testChatEndpoint(model) {
  console.log(`\n--- ${model} on /chat/completions ---`);
  try {
    const r = await fetch('https://api.atlascloud.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Generate an image of a red apple on a white background. Output only the image.' }],
        modalities: ['text', 'image'],
      }),
    });
    const t = await r.text();
    const hasImage = t.includes('image_url') || t.includes('b64_json') || t.includes('data:image');
    console.log(`  Status: ${r.status} ${hasImage ? 'HAS IMAGE' : ''}`);
    console.log(`  Body (300): ${t.substring(0, 300)}`);
    return r.status === 200;
  } catch(e) { console.log(`  Error: ${e.message}`); return false; }
}

async function main() {
  const imageModels = [
    'google/gemini-2.5-flash-image',
    'google/gemini-3-pro-image-preview',
  ];

  for (const m of imageModels) {
    const ok = await testImagesEndpoint(m);
    if (!ok) await testChatEndpoint(m);
  }
}

main();
