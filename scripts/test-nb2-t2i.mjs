const key = process.env.ATLAS_API_KEY;

async function test(model, params, label) {
  console.log(`Testing: ${label}...`);
  const r = await fetch("https://api.atlascloud.ai/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({ model, ...params }),
  });
  const t = await r.text();
  const ok = r.status === 200 ? "✅" : "❌";
  console.log(ok, label, "[" + r.status + "]:", t.substring(0, 150));
  return r.status === 200;
}

const model = "google/nano-banana-2/text-to-image-developer";

// Test without size
const ok1 = await test(
  model,
  {
    prompt: "A professional product photo of a red sneaker on white background, advertising style",
    n: 1,
    response_format: "b64_json",
  },
  "no size"
);

if (!ok1) {
  // Try with size
  await test(
    model,
    {
      prompt: "A professional product photo of a red sneaker on white background",
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    },
    "with size 1024x1024"
  );
}

console.log("Done!");
