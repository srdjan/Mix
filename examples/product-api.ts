// product_api.ts
import { Bix, type, scope } from "./mod.ts";

// 1. Define Types & Validation
const productSchema = scope({
  name: "string>3",
  price: "number>0",
  category: "'electronics'|'books'|'clothing'",
  inStock: "boolean",
  metadata: {
    tags: "string[]",
    sku: /^[A-Z]{3}-d{4}$/
  }
}).compile();

type Product = typeof productSchema.infer;

// 2. Mock Database
const products = new Map<string, Product>();
products.set("ABC-1234", {
  name: "Wireless Mouse",
  price: 29.99,
  category: "electronics",
  inStock: true,
  metadata: { tags: ["tech", "accessories"], sku: "ABC-1234" }
});

// 3. Initialize Bix
const app = Bix();

// 4. Global Middleware
app.use(async (ctx, next) => { // Logging
  console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${ctx.url.pathname}`);
  await next();
});

app.use(async (ctx, next) => { // Authentication
  const apiKey = ctx.request.headers.get("X-API-Key");
  if (apiKey !== Deno.env.get("API_KEY")) {
    ctx.status = 401;
    return ctx.json({ error: "Invalid API key" });
  }
  await next();
});

// 5. API Endpoints
app.get("/products", (ctx) => {
  const page = parseInt(ctx.query.get("page") || 1;
  const limit = 10;

  const results = Array.from(products.values())
    .slice((page - 1) * limit, page * limit);

  ctx.json({
    data: results,
    _links: {
      self: `/products?page=${page}`,
      next: `/products?page=${page + 1}`,
      prev: page > 1 ? `/products?page=${page - 1}` : undefined
    },
    _meta: {
      total: products.size,
      page,
      limit
    }
  });
});

app.post("/products", {
  schema: { body: productSchema },
  handler: (ctx) => {
    const product = ctx.validated.body.data!;
    const sku = product.metadata.sku;

    if (products.has(sku)) {
      ctx.status = 409;
      return ctx.json({ error: "Product SKU already exists" });
    }

    products.set(sku, product);
    ctx.headers.set("Location", `/products/${sku}`);
    ctx.json(product, { status: 201 });
  }
});

app.get("/products/:sku", {
  schema: {
    params: type({ sku: productSchema.metadata.sku.raw })
  },
  handler: (ctx) => {
    const sku = ctx.params.sku;
    const product = products.get(sku);

    if (!product) {
      ctx.status = 404;
      return ctx.json({ error: "Product not found" });
    }

    ctx.json({
      ...product,
      _links: {
        self: `/products/${sku}`,
        reviews: `/products/${sku}/reviews`,
        category: `/categories/${product.category}`
      }
    });
  }
});

app.put("/products/:sku", {
  schema: {
    params: type({ sku: productSchema.metadata.sku.raw }),
    body: productSchema
  },
  handler: (ctx) => {
    const sku = ctx.params.sku;
    const update = ctx.validated.body.data!;

    if (!products.has(sku)) {
      ctx.status = 404;
      return ctx.json({ error: "Product not found" });
    }

    products.set(sku, { ...products.get(sku)!, ...update });
    ctx.json(products.get(sku));
  }
});

// 6. Error Handling
app.use(async (ctx) => { // 404 Handler
  ctx.status = 404;
  ctx.json({ error: "Endpoint not found" });
});

app.use(async (ctx, next) => { // Global Error Handler
  try {
    await next();
  } catch (err) {
    console.error("API Error:", err);
    ctx.status = 500;
    ctx.json({
      error: "Internal server error",
      requestId: crypto.randomUUID()
    });
  }
});

// 7. Start Server
const port = 3000;
console.log(`Product API running on http://localhost:${port}`);
app.listen({ port });
```