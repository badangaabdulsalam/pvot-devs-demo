#!/usr/bin/env node

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function checkUrl(pathname, options = {}) {
  const url = `${baseUrl}${pathname}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeout);
    return {
      ok: response.ok,
      status: response.status,
      url
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 0,
      url,
      error: error && error.message ? error.message : String(error)
    };
  }
}

async function checkWithRetry(pathname, options = {}, attempts = 3) {
  let lastResult = null;

  for (let i = 0; i < attempts; i += 1) {
    const result = await checkUrl(pathname, options);
    lastResult = result;

    if (result.ok) {
      return result;
    }

    // Retry only for transient network/timeouts and 5xx responses.
    if (result.status !== 0 && result.status < 500) {
      return result;
    }
  }

  return lastResult;
}

function printResult(label, result, detail) {
  const state = result.ok ? "PASS" : "FAIL";
  const extra = detail ? ` | ${detail}` : "";
  console.log(`[${state}] ${label} -> ${result.status}${extra}`);
}

async function run() {
  console.log(`Auditing site at ${baseUrl}`);

  const pages = ["/", "/styles.css", "/app.js", "/images/pivot-devs-logo.svg", "/api/health", "/api/products"];
  let failed = 0;

  for (const page of pages) {
    const result = await checkUrl(page);
    printResult(page, result, result.error ? `error=${result.error}` : "");
    if (!result.ok) failed += 1;
  }

  const productsResponse = await fetch(`${baseUrl}/api/products`);
  if (!productsResponse.ok) {
    console.log("[FAIL] Could not load /api/products; skipping image checks.");
    process.exit(1);
  }

  const productsPayload = await productsResponse.json();
  const items = Array.isArray(productsPayload.items) ? productsPayload.items : [];
  console.log(`Catalog items: ${items.length}`);

  const imageChecks = await Promise.all(
    items.map(async (item) => {
      let imageResult = await checkWithRetry(item.image, { method: "HEAD" });
      if (!imageResult.ok && imageResult.status === 0) {
        imageResult = await checkWithRetry(item.image);
      }

      if (!imageResult.ok) {
        return `${item.id} image ${item.image} => ${imageResult.status}`;
      }

      let fallbackResult = await checkWithRetry(item.fallbackImage, { method: "HEAD" });
      if (!fallbackResult.ok && fallbackResult.status === 0) {
        fallbackResult = await checkWithRetry(item.fallbackImage);
      }

      if (!fallbackResult.ok) {
        return `${item.id} fallback ${item.fallbackImage} => ${fallbackResult.status}`;
      }

      return null;
    })
  );

  const imageFailures = imageChecks.filter(Boolean);

  if (imageFailures.length) {
    failed += imageFailures.length;
    console.log("Image failures:");
    for (const failure of imageFailures.slice(0, 20)) {
      console.log(`- ${failure}`);
    }
  } else {
    console.log("All product and fallback images resolved successfully.");
  }

  const ordersList = await checkUrl("/api/orders");
  printResult("/api/orders", ordersList, "read-only smoke check");
  if (!ordersList.ok) failed += 1;

  if (failed > 0) {
    console.log(`Audit finished with issues: ${failed}`);
    process.exit(1);
  }

  console.log("Audit finished clean: storefront, API, and image reliability checks passed.");
}

run().catch((error) => {
  console.error("Audit failed unexpectedly:", error);
  process.exit(1);
});
