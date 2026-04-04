const https = require("https");

const BASE_URL = "https://op-ic-speaking-coach.vercel.app";
const MARKERS = [
  "General",
  "Suggested transcript",
  "How to improve for OPIc",
  "Get AI Feedback",
];

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body });
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const page = await get(`${BASE_URL}/?t=${Date.now()}`);
  console.log("status", page.status);

  const chunkRegex = /\/_next\/static\/chunks\/app\/page-[^"']+\.js/g;
  const chunks = [...page.body.matchAll(chunkRegex)].map((m) => m[0]);
  const uniqueChunks = [...new Set(chunks)];

  console.log("chunks", uniqueChunks);

  for (const chunkPath of uniqueChunks) {
    const js = await get(`${BASE_URL}${chunkPath}`);
    const markerFlags = MARKERS.map((marker) =>
      js.body.includes(marker) ? "Y" : "N"
    ).join("");

    console.log(chunkPath, markerFlags);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
