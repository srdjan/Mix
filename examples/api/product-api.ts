// product_api.ts
import { App, type, scope, match } from "./mod.ts";

// 1. Define Types & Validation
const productSchema = scope({
  name: "string>3",
  price: "number>0",
  category: "'electronics'|'books'|'clothing'",
  inStock: "boolean",
  metadata: {
    tags: "string[]",
    sku: /^[A-Z]{3}-\d{4}$/
  }
}).compile();

const skuSchema = type(/^[A-Z]{3}-\d{4}$/);

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

// 3. Initialize App
const app = App();
const { utils } = app;

// Performance-optimized middleware (direct mutation)
app.use(async (ctx, next) => {
  console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${new URL(ctx.request.url).pathname}`);
  await next();
});

app.use(async (ctx, next) => {
  const apiKey = ctx.request.headers.get("X-API-Key");

  if (apiKey !== Deno.env.get("API_KEY")) {
    utils.setStatus(ctx, 401);
    return utils.setResponse(ctx, utils.createResponse(ctx, { error: "Invalid API key" }));
  }

  await next();
});

// GET /products - List products with pagination
app.get("/products", async (ctx) => {
  // Use handleResult with direct context mutation
  return utils.handleResult(ctx.validated.query, ctx,
    (query, ctx) => {
      const page = parseInt(query.page || "1", 10);
      const limit = 10;

      const results = Array.from(products.values())
        .slice((page - 1) * limit, page * limit);

      return utils.setResponse(ctx, utils.createResponse(ctx, {
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
      }));
    },
    (error, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid query parameters",
        details: error
      }));
    }
  );
});

// POST /products - Create a new product
app.post("/products", async (ctx) => {
  // Validate request body
  if (!ctx.validated.body.ok) {
    utils.setStatus(ctx, 400);
    return utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Invalid request data",
      details: ctx.validated.body.error
    }));
  }

  const validation = utils.validate(productSchema, ctx.validated.body.value);

  return utils.handleResult(validation, ctx,
    (product, ctx) => {
      const sku = product.metadata.sku;

      if (products.has(sku)) {
        utils.setStatus(ctx, 409);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Product SKU already exists"
        }));
      }

      // Store product (side effect)
      products.set(sku, product);

      // Return response with location header (mutating context)
      utils.setStatus(ctx, 201);
      utils.setHeader(ctx, "Location", `/products/${sku}`);
      return utils.setResponse(ctx, utils.createResponse(ctx, product));
    },
    (error, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid product data",
        details: error
      }));
    }
  );
});

// GET /products/:sku - Get a specific product
app.get<{ sku: string }>("/products/:sku", async (ctx) => {
  return utils.handleResult(ctx.validated.params, ctx,
    (params, ctx) => {
      const sku = params.sku;
      const product = products.get(sku);

      if (!product) {
        utils.setStatus(ctx, 404);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Product not found"
        }));
      }

      return utils.setResponse(ctx, utils.createResponse(ctx, {
        ...product,
        _links: {
          self: `/products/${sku}`,
          reviews: `/products/${sku}/reviews`,
          category: `/categories/${product.category}`
        }
      }));
    },
    (error, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid SKU format",
        details: error
      }));
    }
  );
});

// PUT /products/:sku - Update a product
app.put<{ sku: string }>("/products/:sku", async (ctx) => {
  // Validate parameters and body
  if (!ctx.validated.params.ok || !ctx.validated.body.ok) {
    utils.setStatus(ctx, 400);
    return utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Invalid request data",
      details: [
        ...(ctx.validated.params.ok ? [] : ["Invalid SKU"]),
        ...(ctx.validated.body.ok ? [] : ["Invalid product data"])
      ]
    }));
  }

  const sku = ctx.validated.params.value.sku;

  // Validate against product schema
  const bodyValidation = utils.validate(productSchema, ctx.validated.body.value);

  return utils.handleResult(bodyValidation, ctx,
    (update, ctx) => {
      if (!products.has(sku)) {
        utils.setStatus(ctx, 404);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Product not found"
        }));
      }

      // Update product with direct mutation (in store)
      const existingProduct = products.get(sku)!;
      const updatedProduct = { ...existingProduct, ...update };
      products.set(sku, updatedProduct);

      return utils.setResponse(ctx, utils.createResponse(ctx, updatedProduct));
    },
    (error, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid product data",
        details: error
      }));
    }
  );
});

// DELETE /products/:sku - Delete a product
app.delete<{ sku: string }>("/products/:sku", async (ctx) => {
  return utils.handleResult(ctx.validated.params, ctx,
    (params, ctx) => {
      const sku = params.sku;

      if (!products.has(sku)) {
        utils.setStatus(ctx, 404);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Product not found"
        }));
      }

      // Delete product (side effect)
      products.delete(sku);

      utils.setStatus(ctx, 204);
      return utils.setResponse(ctx, new Response(null, { status: 204 }));
    },
    (error, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid SKU format",
        details: error
      }));
    }
  );
});

// Sample middleware for benchmarking
app.use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  console.log(`Request processed in ${duration.toFixed(2)}ms`);
});

// Error handling middleware (optimized for performance)
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("API Error:", err);

    utils.setStatus(ctx, 500);
    utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Internal server error",
      requestId: crypto.randomUUID()
    }));
  }
});

// 404 handler (last middleware)
app.use(async (ctx) => {
  if (!ctx.response) {
    utils.setStatus(ctx, 404);
    utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Endpoint not found"
    }));
  }
});

// Start server with optimized settings
const port = 3000;
app.listen({
  port,
  onListen: ({ hostname, port }) => {
    console.log(`Product API running at http://${hostname}:${port}`);
  }
});