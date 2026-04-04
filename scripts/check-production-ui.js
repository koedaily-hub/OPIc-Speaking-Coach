const https = require("https");
const http = require("http");

const PROD_URL = "https://op-ic-speaking-coach.vercel.app";
const LOCAL_URL = "http://localhost:3000";
const MARKERS = [
  "General",
  "Suggested transcript",
  "How to improve for OPIc",
  "Get AI Feedback",
];

function get(url) {
  const client = url.startsWith("https://") ? https : http;

  return new Promise((resolve, reject) => {
    client
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

async function inspectBase(baseUrl, label) {
  const page = await get(`${baseUrl}/?t=${Date.now()}`);
  const chunkRegex = /\/_next\/static\/chunks\/app\/page(?:-[^"']+)?\.js/g;
  const chunks = [...page.body.matchAll(chunkRegex)].map((m) => m[0]);
  const uniqueChunks = [...new Set(chunks)];

  const result = {
    label,
    status: page.status,
    chunks: uniqueChunks,
    markerMap: {},
  };

  for (const chunkPath of uniqueChunks) {
    const js = await get(`${baseUrl}${chunkPath}`);
    result.markerMap[chunkPath] = Object.fromEntries(
      MARKERS.map((marker) => [marker, js.body.includes(marker)])
    );
  }

  return result;
}

function printResult(result) {
  console.log(`\n=== ${result.label} ===`);
  console.log("status", result.status);
  console.log("chunks", result.chunks);

  for (const chunkPath of result.chunks) {
    const flags = MARKERS.map((marker) =>
      result.markerMap[chunkPath]?.[marker] ? "Y" : "N"
    ).join("");

    console.log(chunkPath, flags);
  }
}

function compare(localResult, prodResult) {
  console.log("\n=== LOCALHOST vs PRODUCTION (by marker) ===");

  const localMarkers = {};
  const prodMarkers = {};

  for (const marker of MARKERS) {
    localMarkers[marker] = Object.values(localResult.markerMap).some(
      (m) => m[marker]
    );
    prodMarkers[marker] = Object.values(prodResult.markerMap).some(
      (m) => m[marker]
    );
  }

  let mismatch = false;
  for (const marker of MARKERS) {
    const localVal = localMarkers[marker] ? "Y" : "N";
    const prodVal = prodMarkers[marker] ? "Y" : "N";
    const same = localVal === prodVal;
    if (!same) mismatch = true;

    console.log(`${marker}: localhost=${localVal} | production=${prodVal}${same ? "" : "  <-- DIFF"}`);
  }

  if (!mismatch) {
    console.log("No marker mismatch between localhost and production.");
  }
}

async function main() {
  const localResult = await inspectBase(LOCAL_URL, "LOCALHOST");
  const prodResult = await inspectBase(PROD_URL, "PRODUCTION");

  printResult(localResult);
  printResult(prodResult);
  compare(localResult, prodResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
