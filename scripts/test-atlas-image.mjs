import { config } from "dotenv";
config();

const key = process.env.ATLAS_API_KEY;
console.log("Key exists:", !!key, "Length:", key?.length);

const url = "https://api.atlascloud.ai/api/v1/model/generateImage";
console.log("Calling:", url);
console.log("Model: google/nano-banana-2/text-to-image");

const start = Date.now();
try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/nano-banana-2/text-to-image",
      prompt: "A simple red circle on white background",
      aspect_ratio: "1:1",
      enable_base64_output: false,
      enable_sync_mode: false,
      output_format: "png",
      resolution: "2k",
    }),
  });
  const elapsed = Date.now() - start;
  console.log("Status:", res.status, "in", elapsed, "ms");
  const json = await res.json();
  console.log("Response:", JSON.stringify(json, null, 2).slice(0, 800));

  // If we got a prediction ID, try polling
  const predId = json.data?.id || json.id;
  if (predId) {
    console.log("\nGot prediction ID:", predId, "- polling...");
    const pollUrl = `https://api.atlascloud.ai/api/v1/model/prediction/${predId}`;

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const pollJson = await pollRes.json();
      const status = pollJson.data?.status || pollJson.status;
      const outputs = pollJson.data?.outputs || pollJson.outputs;
      console.log(`Poll ${i + 1} - status: ${status}, outputs: ${outputs?.length || 0}`);
      if (status === "completed" || status === "succeeded") {
        console.log("Image URL:", outputs?.[0]);
        break;
      }
      if (status === "failed") {
        console.log("Failed:", pollJson.data?.error || pollJson.error);
        break;
      }
    }
  }
} catch (err) {
  const elapsed = Date.now() - start;
  console.log("Error after", elapsed, "ms:", err.message);
}
