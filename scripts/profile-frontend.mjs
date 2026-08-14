import { chromium } from "@playwright/test";

const url = process.env.TREASURY_PROFILE_URL || "http://localhost:3000";
const durationMs = Number(process.env.TREASURY_PROFILE_DURATION_MS || 15_000);
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;

if (!Number.isFinite(durationMs) || durationMs <= 0) {
  throw new Error("TREASURY_PROFILE_DURATION_MS must be a positive number");
}

const DELTA_METRICS = [
  "TaskDuration",
  "ScriptDuration",
  "LayoutDuration",
  "RecalcStyleDuration",
  "LayoutCount",
  "RecalcStyleCount",
];

const metricMap = (result) =>
  Object.fromEntries(result.metrics.map(({ name, value }) => [name, value]));

const profile = async (browser, reducedMotion) => {
  const context = await browser.newContext({ reducedMotion });
  const page = await context.newPage();
  const requests = [];
  const consoleProblems = [];

  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleProblems.push(`pageerror: ${error.message}`);
  });

  await page.goto(url, { waitUntil: "networkidle" });
  const session = await context.newCDPSession(page);
  await session.send("Performance.enable");
  await session.send("HeapProfiler.collectGarbage");
  const before = metricMap(await session.send("Performance.getMetrics"));

  await page.waitForTimeout(durationMs);

  await session.send("HeapProfiler.collectGarbage");
  const after = metricMap(await session.send("Performance.getMetrics"));
  const scriptSources = await page.locator("script[src]").evaluateAll((scripts) =>
    scripts.map((script) => script.getAttribute("src")),
  );

  const deltas = Object.fromEntries(
    DELTA_METRICS.map((name) => [
      name,
      Number(((after[name] || 0) - (before[name] || 0)).toFixed(6)),
    ]),
  );

  const result = {
    reducedMotion,
    durationMs,
    deltas,
    retained: {
      jsHeapMb: Number(((after.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(2)),
      nodes: after.Nodes,
      documents: after.Documents,
      eventListeners: after.JSEventListeners,
    },
    requests: requests.length,
    scriptSources,
    duplicateScriptSources: scriptSources.filter(
      (source, index) => source && scriptSources.indexOf(source) !== index,
    ),
    consoleProblems,
  };

  await context.close();
  return result;
};

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

try {
  const results = [];
  for (const reducedMotion of ["no-preference", "reduce"]) {
    results.push(await profile(browser, reducedMotion));
  }
  process.stdout.write(`${JSON.stringify({ url, results }, null, 2)}\n`);
} finally {
  await browser.close();
}
