import sharp from "sharp";
import { readFileSync } from "fs";

const key = process.env.ATLAS_API_KEY;

async function run() {
  // Create a 512x512 red product image
  const testImg = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 200, g: 50, b: 50, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  console.log("Image size:", testImg.length, "bytes");

  const form = new FormData();
  form.append("model", "google/nano-banana-2/edit-developer");
  form.append(
    "prompt",
    "Transform this into a professional advertising photo with white background, product showcase style"
  );
  form.append("n", "1");
  form.append(
    "image",
    new Blob([testImg], { type: "image/png" }),
    "product.png"
  );

  const r = await fetch("https://api.atlascloud.ai/v1/images/edits", {
    method: "POST",
    headers: { Authorization: "Bearer " + key },
    body: form,
  });

  const t = await r.text();
  console.log("[" + r.status + "]:", t.substring(0, 600));
}

run().catch(console.error);
