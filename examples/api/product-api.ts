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

// Schema validation middleware factory
const validateSchema = <T>(schema: ReturnType<typeof type>) =>
  async (ctx: any, next: () => Promise<void>) => {
    if (!ctx.validated.body.ok) {
      return utils.withResponse(
        utils.withStatus(ctx, 400),
        utils.createResponse(ctx, {
          error: "Invalid request data",
          details: ctx.validated.body.error
        })
      );
    }

    const validation = utils.validate(schema, ctx.validated.body.value);

    return utils.match(validation)
      .with({ ok: true }, () => next())
      .with({ ok: false }, ({ error }) =>
        utils.withResponse(
          utils.withStatus(ctx, 400),
          utils.createResponse(ctx, {
            error: "Schema validation failed",
            details: error
          })
        )
      )
      .exhaustive();
  };

// 4. Global Middleware
app.use(async (ctx, next) => {
  console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${new URL(ctx.request.url).pathname}`);
  await next();
});

app.use(async (ctx, next) => {
  const apiKey = ctx.request.headers.get("X-API-Key");

  return utils.match(apiKey === Deno.env.get("API_KEY"))
    .when(true, () => next())
    .otherwise(() =>
      utils.withResponse(
        utils.withStatus(ctx, 401),
        utils.createResponse(ctx, { error: "Invalid API key" })
      )
    );
});

// 5. API Endpoints
app.get("/products", async (ctx) => {
  return utils.handleResult(ctx.validated.query,
    query => {
      const page = parseInt(query.page || "1", 10);
      const limit = 10;

      const results = Array.from(products.values())
        .slice((page - 1) * limit, page * limit);

      return utils.withResponse(ctx, utils.createResponse(ctx, {
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
    error => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid query parameters",
        details: error
      })
    )
  );
});

// POST /products with schema validation
app.post("/products", async (ctx) => {
  // Apply schema validation
  if (!ctx.validated.body.ok) {
    return utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid request data",
        details: ctx.validated.body.error
      })
    );
  }

  const validation = utils.validate(productSchema, ctx.validated.body.value);

  return utils.handleResult(validation,
    product => {
      const sku = product.metadata.sku;

      return utils.match(products.has(sku))
        .when(true, () => utils.withResponse(
          utils.withStatus(ctx, 409),
          utils.createResponse(ctx, { error: "Product SKU already exists" })
        ))
        .otherwise(() => {
          // Store product (side effect)
          products.set(sku, product);

          // Return response with location header
          return utils.withResponse(
            utils.withHeader(
              utils.withStatus(ctx, 201),
              "Location",
              `/products/${sku}`
            ),
            utils.createResponse(ctx, product)
          );
        });
    },
    error => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid product data",
        details: error
      })
    )
  );
});

// GET /products/:sku
app.get<{ sku: string }>("/products/:sku", async (ctx) => {
  return utils.handleResult(ctx.validated.params,
    params => {
      const sku = params.sku;
      const product = products.get(sku);

      return utils.match(product)
        .with(match.defined, product => utils.withResponse(
          ctx,
          utils.createResponse(ctx, {
            ...product,
            _links: {
              self: `/products/${sku}`,
              reviews: `/products/${sku}/reviews`,
              category: `/categories/${product.category}`
            }
          })
        ))
        .otherwise(() => utils.withResponse(
          utils.withStatus(ctx, 404),
          utils.createResponse(ctx, { error: "Product not found" })
        ));
    },
    error => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid SKU format",
        details: error
      })
    )
  );
});

// PUT /products/:sku
app.put<{ sku: string }>("/products/:sku", async (ctx) => {
  // Validate params and body
  if (!ctx.validated.params.ok || !ctx.validated.body.ok) {
    return utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid request data",
        details: [
          ...(ctx.validated.params.ok ? [] : ["Invalid SKU"]),
          ...(ctx.validated.body.ok ? [] : ["Invalid product data"])
        ]
      })
    );
  }

  const sku = ctx.validated.params.value.sku;

  // Validate body against product schema
  const validation = utils.validate(productSchema, ctx.validated.body.value);

  return utils.handleResult(validation,
    update => utils.match(products.has(sku))
      .when(false, () => utils.withResponse(
        utils.withStatus(ctx, 404),
        utils.createResponse(ctx, { error: "Product not found" })
      ))
      .otherwise(() => {
        // Update product (side effect with immutability)
        const existingProduct = products.get(sku)!;
        const updatedProduct = { ...existingProduct, ...update };
        products.set(sku, updatedProduct);

        return utils.withResponse(
          ctx,
          utils.createResponse(ctx, updatedProduct)
        );
      }),
    error => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid product data",
        details: error
      })
    )
  );
});

// 6. Error Handling
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("API Error:", err);

    return utils.withResponse(
      utils.withStatus(ctx, 500),
      utils.createResponse(ctx, {
        error: "Internal server error",
        requestId: crypto.randomUUID()
      })
    );
  }
});

// 404 handler (last middleware)
app.use(async (ctx) => {
  if (!ctx.response) {
    return utils.withResponse(
      utils.withStatus(ctx, 404),
      utils.createResponse(ctx, { error: "Endpoint not found" })
    );
  }
});

// 7. Start Server
const port = 3000;
console.log(`Product API running on http://localhost:${port}`);

app.listen({
  port,
  onListen: ({ hostname, port }) => {
    console.log(`Product API running on http://${hostname}:${port}`);
  }
});