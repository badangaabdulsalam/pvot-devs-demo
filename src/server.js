const crypto = require("crypto");
const fs = require("fs/promises");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const PRODUCT_IMAGES_DIR = path.join(PUBLIC_DIR, "images", "products");
const DEFAULT_IMAGE_FALLBACK = path.join(PUBLIC_DIR, "images", "product-fallback.svg");
const DEFAULT_LOGO_FALLBACK = path.join(PUBLIC_DIR, "images", "pivot-devs-logo.svg");

const PRICE_CONVERSION_RATE_NGN = 1600;
const TAX_RATE = 0.07;
const SHIPPING_FLAT = 16000;
const FREE_SHIPPING_THRESHOLD = 288000;
const MAX_CART_LINES = 40;
const MAX_LINE_QUANTITY = 20;
const MAX_BODY_BYTES = 1_000_000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const catalogTemplates = {
  Clothing: [
    ["Nova Storm Trench", 149, "avant garde coat fashion", "Sculpted silhouette coat with reflective storm seams."],
    ["Pixel Drip Hoodie", 89, "streetwear hoodie fashion", "Oversized hoodie splashed with reactive pixel graphics."],
    ["Solar Flare Crop Jacket", 119, "fashion crop jacket", "Short-cut jacket with blazing contrast trims."],
    ["Orbit Pleated Pants", 78, "designer pleated pants", "High-motion pleated pants built for dramatic movement."],
    ["Liquid Chrome Bomber", 135, "metallic bomber jacket", "Mirror-sheen bomber inspired by city night lights."],
    ["Voltage Denim Set", 112, "runway denim set", "Two-piece denim pair with electric stitching paths."],
    ["Mirage Mesh Dress", 124, "futuristic mesh dress", "Layered mesh dress designed for light and flow."],
    ["Echo Utility Shirt", 72, "fashion utility shirt", "Structured utility shirt with modular pocket layout."],
    ["Rebel Satin Skirt", 68, "satin fashion skirt", "Satin skirt with asymmetrical rebellious drape."],
    ["Hyperloop Tracksuit", 99, "stylish tracksuit", "Performance tracksuit in bold kinetic color blocking."]
  ],
  Perfume: [
    ["Citrus Riot Extrait", 95, "luxury perfume bottle", "Sparkling citrus opening with smoky cedar base."],
    ["Midnight Neon", 129, "premium fragrance bottle", "Dark amber, pink pepper, and velvet musk fusion."],
    ["Velvet Thunder", 118, "perfume product shot", "Rose suede heart with thunderous oud undertone."],
    ["Ocean Static", 105, "niche perfume", "Fresh sea mineral accord electrified by bergamot."],
    ["Golden Pulse", 139, "high end perfume", "Saffron blossom with warm honeyed sandalwood."],
    ["Smoke Blossom", 112, "perfume glass bottle", "Floral smoke accord with a deep resin trail."],
    ["Electric Vanilla", 98, "modern perfume bottle", "Creamy vanilla lifted by cardamom sparkle."],
    ["Cosmic Cedar", 122, "fragrance on dark background", "Cedar atlas, clary sage, and cool metallic musk."]
  ],
  Jewelry: [
    ["Prism Arc Necklace", 82, "modern necklace jewelry", "Arc necklace that catches color from every angle."],
    ["Comet Chain Layer", 74, "layered chain jewelry", "Layer-ready comet chain with polished links."],
    ["Meteor Ring Stack", 69, "designer rings", "Set of stackable rings with meteor-textured finish."],
    ["Aurora Drop Earrings", 61, "fashion drop earrings", "Fluid drop earrings inspired by northern lights."],
    ["Titan Halo Bracelet", 77, "bracelet luxury jewelry", "Halo bracelet with brushed titanium look."],
    ["Orbit Pearl Choker", 88, "pearl choker fashion", "Reimagined pearl choker with orbital spacers."],
    ["Lunar Cuff", 93, "statement cuff bracelet", "Wide lunar cuff for bold statement styling."],
    ["Nova Gem Anklet", 58, "anklet jewelry", "Gem-tipped anklet with playful movement."],
    ["Cipher Signet", 86, "signet ring fashion", "Minimal signet ring engraved with coded motifs."],
    ["Static Star Brooch", 54, "fashion brooch", "Starburst brooch for jackets, bags, or scarves."]
  ],
  Shoes: [
    ["Velocity Chunk Sneakers", 146, "chunky sneakers fashion", "Chunky sneaker profile tuned for all-day bounce."],
    ["Chrome Tide Boots", 172, "fashion ankle boots", "Ankle boots with metallic tide panel details."],
    ["Blaze Runner Knit", 134, "knit running shoes", "Breathable knit runners with hot-stripe accents."],
    ["Mirage Platform Heels", 158, "platform heels", "Architectural platform heels for show-stopping looks."],
    ["Pulse Slip Loafers", 121, "modern loafers", "Slip loafers with sculpted sole and velvet lining."],
    ["Night Drive High Tops", 142, "high top sneakers", "High tops inspired by neon-lit midnight highways."],
    ["Sonic Sandals", 109, "fashion sandals", "Open sandals with amplified contour footbed."],
    ["Afterglow Mules", 117, "stylish mules", "Sharp mules with afterglow gradient finish."]
  ],
  Bags: [
    ["Cyber Satchel", 138, "designer satchel bag", "Compact satchel with geometric hard-shell lines."],
    ["Flare Mini Backpack", 126, "fashion mini backpack", "Mini backpack that glows with color energy."],
    ["Gravity Tote", 119, "luxury tote bag", "Oversized tote engineered for style and storage."],
    ["Echo Belt Bag", 84, "belt bag fashion", "Cross-body belt bag with quick-access front hatch."],
    ["Prism Clutch", 96, "statement clutch", "Facet-inspired clutch for evening impact."],
    ["Volt Messenger", 132, "messenger bag modern", "Messenger bag with padded sleeve and tech pockets."],
    ["Orbit Weekender", 166, "weekender bag travel", "Weekend-ready bag in high-capacity silhouette."],
    ["Riot Bucket Bag", 102, "bucket bag fashion", "Soft bucket bag with riot-color drawcord detailing."]
  ],
  Watches: [
    ["Pulse Chrono X", 214, "luxury chronograph watch", "Chronograph watch with multi-layer dial depth."],
    ["Solar Drift", 198, "modern wrist watch", "Sun-powered watch face in brushed steel casing."],
    ["Nebula Skeleton", 239, "skeleton watch", "Open-work skeleton design showcasing mechanical rhythm."],
    ["Rogue GMT", 226, "gmt wristwatch", "Dual-time GMT build for global movement."],
    ["Iceline Digital", 179, "digital fashion watch", "Crisp digital display with ice-tone finish."],
    ["Axis Field Watch", 188, "field watch stylish", "Field-ready construction with elevated detailing."]
  ],
  Skincare: [
    ["Glow Reactor Serum", 52, "luxury skincare serum", "Brightening serum with niacinamide and peptide blend."],
    ["Cloud Melt Cleanser", 34, "facial cleanser product", "Gentle melt cleanser that removes long-wear makeup."],
    ["Hydra Wave Mist", 29, "face mist beauty", "Hydration mist charged with marine minerals."],
    ["Night Reset Cream", 46, "night cream skincare", "Overnight barrier support cream with ceramides."],
    ["Solar Guard SPF 50", 39, "sunscreen skincare", "Invisible finish SPF designed for daily wear."],
    ["Prism Eye Gel", 31, "eye gel skincare", "Cooling eye gel for tired, stressed skin."]
  ],
  Accessories: [
    ["Photon Sunglasses", 88, "fashion sunglasses", "Angular sunglasses with polarized lenses."],
    ["Neon Silk Scarf", 44, "colorful silk scarf", "Silk scarf printed with burst-spectrum graphics."],
    ["Cipher Wallet", 57, "designer wallet", "Slim wallet with embossed coded pattern."],
    ["Rift Phone Strap", 29, "phone strap fashion", "Wearable phone strap built for motion and style."],
    ["Echo Cap", 36, "fashion cap", "Structured cap with reflective stitch panels."],
    ["Flux Hair Clip Set", 24, "trendy hair clips", "Clip set in mixed-metal futuristic shapes."],
    ["Static Gloves", 41, "fashion gloves", "Soft gloves with tactile conductive fingertips."],
    ["Arc Key Charm", 19, "bag charm accessory", "Key charm that adds instant character to any bag."]
  ]
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let orderWriteQueue = Promise.resolve();

function buildSeedCatalog() {
  const products = [];
  let index = 1;

  for (const [category, items] of Object.entries(catalogTemplates)) {
    for (const item of items) {
      const [name, price, imageQuery, description] = item;
      products.push({
        id: `SKU-${String(index).padStart(3, "0")}`,
        name,
        category,
        description,
        price: roundMoney(price * PRICE_CONVERSION_RATE_NGN),
        stock: 9 + (index % 14),
        rating: Number((3.9 + (index % 10) * 0.1).toFixed(1)),
        featured: index % 7 === 0,
        image: buildProductImageUrl(name, category, index),
        fallbackImage: buildProductFallbackImageUrl(name, category, index)
      });
      index += 1;
    }
  }

  return products;
}

function imageSearchTerms(name, category) {
  const base = `${name} ${category} product`;
  return base
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildProductImageUrl(name, category, index) {
  return `/images/products/SKU-${String(index).padStart(3, "0")}.jpg`;
}

const CATEGORY_IMAGE_MAP = {
  Clothing: "/images/categories-photo/clothing.jpg",
  Perfume: "/images/categories-photo/perfume.jpg",
  Jewelry: "/images/categories-photo/jewelry.jpg",
  Shoes: "/images/categories-photo/shoes.jpg",
  Bags: "/images/categories-photo/bags.jpg",
  Watches: "/images/categories-photo/watches.jpg",
  Skincare: "/images/categories-photo/skincare.jpg",
  Accessories: "/images/categories-photo/accessories.jpg"
};

function buildProductFallbackImageUrl(name, category, index) {
  return CATEGORY_IMAGE_MAP[category] || "/images/product-fallback.svg";
}

function withProductImages(products) {
  return products.map((product, index) => ({
    ...product,
    image: buildProductImageUrl(product.name, product.category, index + 1),
    fallbackImage: buildProductFallbackImageUrl(product.name, product.category, index + 1)
  }));
}

function hasLegacyLowPrices(products) {
  return products.some((product) => Number(product.price) < 1000);
}

function migrateLegacyPricesToNaira(products) {
  return products.map((product) => ({
    ...product,
    price: roundMoney(Number(product.price) * PRICE_CONVERSION_RATE_NGN)
  }));
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function makeOrderId() {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStamp = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${dateStamp}-${randomStamp}`;
}

function cleanString(value) {
  return String(value || "").trim();
}

function validateCheckoutPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new ApiError(400, "Checkout payload is missing.");
  }

  const { customer, cart } = payload;

  if (!customer || typeof customer !== "object") {
    throw new ApiError(400, "Customer details are required.");
  }

  const requiredFields = ["name", "email", "phone", "address1", "city", "country", "postalCode"];

  for (const field of requiredFields) {
    if (!cleanString(customer[field])) {
      throw new ApiError(400, `Customer field '${field}' is required.`);
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(cleanString(customer.email))) {
    throw new ApiError(400, "Please enter a valid email address.");
  }

  if (!Array.isArray(cart) || cart.length === 0) {
    throw new ApiError(400, "Cart cannot be empty.");
  }

  if (cart.length > MAX_CART_LINES) {
    throw new ApiError(400, "Cart has too many line items.");
  }

  for (const line of cart) {
    if (!line || typeof line !== "object") {
      throw new ApiError(400, "Each cart line must be an object.");
    }

    const productId = cleanString(line.productId);
    const quantity = Number(line.quantity);

    if (!productId) {
      throw new ApiError(400, "Each cart line needs a product ID.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new ApiError(400, `Quantity for ${productId} must be between 1 and ${MAX_LINE_QUANTITY}.`);
    }
  }
}

function normalizeCustomer(customer) {
  return {
    name: cleanString(customer.name),
    email: cleanString(customer.email).toLowerCase(),
    phone: cleanString(customer.phone),
    address1: cleanString(customer.address1),
    address2: cleanString(customer.address2),
    city: cleanString(customer.city),
    country: cleanString(customer.country),
    postalCode: cleanString(customer.postalCode)
  };
}

function sortProducts(products, sortMode) {
  const items = [...products];

  switch (sortMode) {
    case "price-asc":
      items.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      items.sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      items.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "rating-desc":
      items.sort((a, b) => b.rating - a.rating);
      break;
    default:
      items.sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating);
  }

  return items;
}

function calculateOrder(cart, products) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const lines = [];
  const stockUpdates = [];
  let subtotal = 0;

  for (const line of cart) {
    const productId = cleanString(line.productId);
    const quantity = Number(line.quantity);
    const product = productById.get(productId);

    if (!product) {
      throw new ApiError(404, `Product '${productId}' does not exist.`);
    }

    if (product.stock < quantity) {
      throw new ApiError(409, `${product.name} only has ${product.stock} left in stock.`);
    }

    const lineTotal = roundMoney(product.price * quantity);
    subtotal += lineTotal;

    lines.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      unitPrice: product.price,
      quantity,
      lineTotal
    });

    stockUpdates.push({ productId: product.id, quantity });
  }

  subtotal = roundMoney(subtotal);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const tax = roundMoney(subtotal * TAX_RATE);
  const total = roundMoney(subtotal + shipping + tax);

  return {
    lines,
    stockUpdates,
    totals: {
      subtotal,
      shipping,
      tax,
      total
    }
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallbackValue;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(PRODUCT_IMAGES_DIR, { recursive: true });

  if (!(await fileExists(PRODUCTS_FILE))) {
    await writeJson(PRODUCTS_FILE, buildSeedCatalog());
  } else {
    const existingProducts = await readJson(PRODUCTS_FILE, []);
    if (Array.isArray(existingProducts) && existingProducts.length && hasLegacyLowPrices(existingProducts)) {
      await writeJson(PRODUCTS_FILE, migrateLegacyPricesToNaira(existingProducts));
    }
  }

  if (!(await fileExists(ORDERS_FILE))) {
    await writeJson(ORDERS_FILE, []);
  }
}

function enqueueOrderWrite(task) {
  // Serialize writes so stock updates remain consistent under concurrent checkouts.
  const nextTask = orderWriteQueue.then(task);
  orderWriteQueue = nextTask.catch(() => undefined);
  return nextTask;
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length
  });
  res.end(body);
}

function sendRaw(res, status, body, contentType) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": buffer.length
  });
  res.end(buffer);
}

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function getSafePublicPath(pathname) {
  const normalized = path.normalize(pathname).replace(/^([\\/])+/, "");
  const resolved = path.resolve(PUBLIC_DIR, normalized || "index.html");
  const normalized_resolved = path.normalize(resolved).toLowerCase();
  const normalized_public = path.normalize(PUBLIC_DIR).toLowerCase();
  if (!normalized_resolved.startsWith(normalized_public)) {
    return null;
  }
  return resolved;
}

function resolveStaticFallbackPath(pathname) {
  const normalized = String(pathname || "").toLowerCase();

  if (normalized.startsWith("/images/products/")) {
    return DEFAULT_IMAGE_FALLBACK;
  }

  if (normalized.startsWith("/images/categories-photo/") || normalized.startsWith("/images/categories/")) {
    return DEFAULT_IMAGE_FALLBACK;
  }

  if (normalized.endsWith("/pivot-devs-logo.svg") || normalized.endsWith("/favicon.ico")) {
    return DEFAULT_LOGO_FALLBACK;
  }

  return null;
}

async function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let done = false;
    let totalBytes = 0;
    const chunks = [];

    function safeResolve(value) {
      if (done) return;
      done = true;
      resolve(value);
    }

    function safeReject(error) {
      if (done) return;
      done = true;
      reject(error);
    }

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        safeReject(new ApiError(413, "Request payload too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        safeResolve({});
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        safeResolve(parsed);
      } catch {
        safeReject(new ApiError(400, "Request body must be valid JSON."));
      }
    });

    req.on("error", (error) => {
      safeReject(error);
    });
  });
}

async function handleGetProducts(urlObject, res) {
  const allProducts = await readJson(PRODUCTS_FILE, []);
  const normalizedProducts = withProductImages(allProducts);
  const category = cleanString(urlObject.searchParams.get("category"));
  const search = cleanString(urlObject.searchParams.get("search")).toLowerCase();
  const sortMode = cleanString(urlObject.searchParams.get("sort")) || "featured";

  let products = [...normalizedProducts];

  if (category && category.toLowerCase() !== "all") {
    products = products.filter((product) => product.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    products = products.filter((product) => {
      const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  products = sortProducts(products, sortMode);

  const categories = Array.from(new Set(normalizedProducts.map((product) => product.category))).sort((a, b) =>
    a.localeCompare(b)
  );

  sendJson(res, 200, {
    count: products.length,
    categories,
    items: products
  });
}

async function handleCreateOrder(req, res) {
  const payload = await readRequestJson(req);
  validateCheckoutPayload(payload);

  const customer = normalizeCustomer(payload.customer);
  const cart = payload.cart.map((line) => ({
    productId: cleanString(line.productId),
    quantity: Number(line.quantity)
  }));
  const notes = cleanString(payload.notes).slice(0, 250);

  const createdOrder = await enqueueOrderWrite(async () => {
    const products = await readJson(PRODUCTS_FILE, []);
    const productById = new Map(products.map((product) => [product.id, product]));
    const { lines, stockUpdates, totals } = calculateOrder(cart, products);

    for (const update of stockUpdates) {
      const product = productById.get(update.productId);
      product.stock -= update.quantity;
    }

    const order = {
      id: makeOrderId(),
      createdAt: new Date().toISOString(),
      status: "confirmed",
      etaDays: 2 + (lines.length % 4),
      customer,
      notes,
      items: lines,
      totals
    };

    const orders = await readJson(ORDERS_FILE, []);
    orders.unshift(order);

    await writeJson(PRODUCTS_FILE, products);
    await writeJson(ORDERS_FILE, orders);

    return order;
  });

  sendJson(res, 201, createdOrder);
}

async function handleGetOrderById(pathname, res) {
  const wantedId = cleanString(pathname.slice("/api/orders/".length)).toUpperCase();
  if (!wantedId || wantedId.includes("/")) {
    throw new ApiError(400, "Order ID is required.");
  }

  const orders = await readJson(ORDERS_FILE, []);
  const order = orders.find((item) => item.id.toUpperCase() === wantedId);

  if (!order) {
    throw new ApiError(404, `No order found for ID '${wantedId}'.`);
  }

  sendJson(res, 200, order);
}

async function handleListOrders(urlObject, res) {
  const email = cleanString(urlObject.searchParams.get("email")).toLowerCase();
  const orders = await readJson(ORDERS_FILE, []);

  if (!email) {
    sendJson(res, 200, { count: orders.length, items: orders.slice(0, 20) });
    return;
  }

  const filtered = orders.filter((order) => order.customer.email === email);
  sendJson(res, 200, { count: filtered.length, items: filtered });
}

async function handleApiRequest(req, res, urlObject) {
  const method = req.method || "GET";
  const pathname = urlObject.pathname;

  if (method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, timestamp: new Date().toISOString() });
    return;
  }

  if (method === "GET" && pathname === "/api/products") {
    await handleGetProducts(urlObject, res);
    return;
  }

  if (method === "POST" && pathname === "/api/orders") {
    await handleCreateOrder(req, res);
    return;
  }

  if (method === "GET" && pathname === "/api/orders") {
    await handleListOrders(urlObject, res);
    return;
  }

  if (method === "GET" && pathname.startsWith("/api/orders/")) {
    await handleGetOrderById(pathname, res);
    return;
  }

  throw new ApiError(404, "API endpoint not found.");
}

async function serveStatic(pathname, res) {
  const safePath = getSafePublicPath(pathname);
  if (!safePath) {
    throw new ApiError(403, "Invalid path.");
  }

  const hasExtension = path.extname(pathname) !== "";

  try {
    let targetPath = safePath;
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      targetPath = path.join(targetPath, "index.html");
    }

    const fileData = await fs.readFile(targetPath);
    sendRaw(res, 200, fileData, contentTypeFor(targetPath));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    const fallbackPath = resolveStaticFallbackPath(pathname);
    if (fallbackPath) {
      try {
        const fallbackData = await fs.readFile(fallbackPath);
        sendRaw(res, 200, fallbackData, contentTypeFor(fallbackPath));
        return;
      } catch {
        // If fallback asset is unavailable, continue with default behavior below.
      }
    }

    if (hasExtension) {
      throw new ApiError(404, "Static file not found.");
    }

    const indexPath = path.join(PUBLIC_DIR, "index.html");
    const indexHtml = await fs.readFile(indexPath);
    sendRaw(res, 200, indexHtml, "text/html; charset=utf-8");
  }
}

function handleRequestError(res, error) {
  if (res.writableEnded) {
    return;
  }

  if (error instanceof ApiError) {
    sendJson(res, error.status, { error: error.message });
    return;
  }

  console.error(error);
  sendJson(res, 500, { error: "Unexpected server error. Please try again." });
}

async function startServer() {
  await ensureDataFiles();

  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || `localhost:${PORT}`;
      const urlObject = new URL(req.url || "/", `http://${host}`);

      if (urlObject.pathname.startsWith("/api")) {
        await handleApiRequest(req, res, urlObject);
        return;
      }

      await serveStatic(urlObject.pathname, res);
    } catch (error) {
      handleRequestError(res, error);
    }
  });

  server.listen(PORT, () => {
    console.log(`Pivot Devs Demo website is running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
