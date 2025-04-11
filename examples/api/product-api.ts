import { App, Context } from "../../lib/mix.ts";

// Types & Validation
type ProductCategory = 'electronics' | 'books' | 'clothing';

type Product = {
  name: string;
  price: number;
  category: ProductCategory;
  inStock: boolean;
  metadata: {
    tags: string[];
    sku: string;
  }
};

// Mock Database
const products = new Map<string, Product>();
products.set("ABC-1234", {
  name: "Wireless Mouse",
  price: 29.99,
  category: "electronics",
  inStock: true,
  metadata: { tags: ["tech", "accessories"], sku: "ABC-1234" }
});

// Initialize App
const app = App();

const handleError = (ctx: Context, status: number, message: string, details?: unknown) => {
  ctx.status = status;
  ctx.response = new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
};

const createResponse = (ctx: Context, data: unknown, options?: { links?: Record<string, unknown>; meta?: Record<string, unknown> }) => {
  const responseBody = {
    data,
    ...(options?.links ? { _links: options.links } : {}),
    ...(options?.meta ? { _meta: options.meta } : {})
  };

  return new Response(JSON.stringify(responseBody), {
    status: ctx.status || 200,
    headers: { "Content-Type": "application/json" }
  });
};

// Middleware
app.use(async (ctx, next) => {
  // Request logging
  console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${new URL(ctx.request.url).pathname}`);

  // Performance tracking
  const start = performance.now();

  try {
    // API key validation
    const apiKey = ctx.request.headers.get("X-API-Key");
    if (apiKey !== Deno.env.get("API_KEY")) {
      return handleError(ctx, 401, "Invalid API key");
    }

    await next();

    // 404 handler
    if (!ctx.response) {
      handleError(ctx, 404, "Endpoint not found");
    }
  } catch (err) {
    console.error("API Error:", err);
    handleError(ctx, 500, "Internal server error", { requestId: crypto.randomUUID() });
  } finally {
    const duration = performance.now() - start;
    console.log(`Request processed in ${duration.toFixed(2)}ms`);
  }
});

// GET /products - List products with pagination
app.get("/products", (ctx) => {
  if (!ctx.validated.query.ok) {
    return handleError(ctx, 400, "Invalid query parameters", ctx.validated.query.error);
  }

  const query = ctx.validated.query.value;
  const page = parseInt(query.page || "1", 10);
  const limit = 10;
  const results = Array.from(products.values())
    .slice((page - 1) * limit, page * limit);

  ctx.response = createResponse(ctx, results, {
    links: {
      self: `/products?page=${page}`,
      next: `/products?page=${page + 1}`,
      prev: page > 1 ? `/products?page=${page - 1}` : ''
    },
    meta: {
      total: products.size,
      page,
      limit
    }
  });
});

// POST /products - Create a new product
app.post<Record<string, string>, Product>("/products", (ctx) => {
  if (!ctx.validated.body.ok) {
    return handleError(ctx, 400, "Invalid request data", ctx.validated.body.error);
  }

  const product = ctx.validated.body.value as Product;
  const sku = product.metadata.sku;

  // Check if product already exists
  if (products.has(sku)) {
    return handleError(ctx, 409, "Product SKU already exists");
  }

  // Store product
  products.set(sku, product);

  // Return response with location header
  ctx.status = 201;
  ctx.headers.set("Location", `/products/${sku}`);
  ctx.response = createResponse(ctx, product);
});

// GET /products/:sku - Get a specific product
app.get<{ sku: string }>("/products/:sku", (ctx) => {
  if (!ctx.validated.params.ok) {
    return handleError(ctx, 400, "Invalid SKU format", ctx.validated.params.error);
  }

  const sku = ctx.validated.params.value.sku;
  const product = products.get(sku);

  if (!product) {
    return handleError(ctx, 404, "Product not found");
  }

  ctx.response = createResponse(ctx, product, {
    links: {
      self: `/products/${sku}`,
      reviews: `/products/${sku}/reviews`,
      category: `/categories/${product.category}`
    }
  });
});

// PUT /products/:sku - Update a product
app.put<{ sku: string }, Product>("/products/:sku", (ctx) => {
  // Validate request parameters
  const errors = [];

  if (!ctx.validated.params.ok) errors.push("Invalid SKU");
  if (!ctx.validated.body.ok) errors.push("Invalid product data");

  if (errors.length > 0) {
    return handleError(ctx, 400, "Invalid request data", errors);
  }

  // We know these are valid at this point because we checked ctx.validated.params.ok
  // TypeScript doesn't understand this, so we need to use type assertions
  const params = ctx.validated.params as { ok: true; value: { sku: string } };
  const body = ctx.validated.body as { ok: true; value: Product };

  const sku = params.value.sku;
  const update = body.value;

  // Check if product exists
  if (!products.has(sku)) {
    return handleError(ctx, 404, "Product not found");
  }

  // Update product
  const existingProduct = products.get(sku)!;
  const updatedProduct = { ...existingProduct, ...update };
  products.set(sku, updatedProduct);

  ctx.response = createResponse(ctx, updatedProduct);
});

// DELETE /products/:sku - Delete a product
app.delete<{ sku: string }>("/products/:sku", (ctx) => {
  if (!ctx.validated.params.ok) {
    return handleError(ctx, 400, "Invalid SKU format", ctx.validated.params.error);
  }

  const sku = ctx.validated.params.value.sku;

  if (!products.has(sku)) {
    return handleError(ctx, 404, "Product not found");
  }

  // Delete product
  products.delete(sku);

  // Return empty response with 204 status
  ctx.status = 204;
  ctx.response = new Response(null, { status: 204 });
});

const port = 3000;
app.listen(port);
console.log(`Product API running at http://localhost:${port}`);
