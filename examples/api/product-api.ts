import { App, scope, type ValidationResult, match } from "../../lib/mix.ts";

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

type Product = {
  name: string;
  price: number;
  category: 'electronics' | 'books' | 'clothing';
  inStock: boolean;
  metadata: {
    tags: string[];
    sku: string;
  }
};

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
  return match({ valid: apiKey === Deno.env.get("API_KEY") })
    .with({ valid: false }, () => {
      utils.setStatus(ctx, 401);
      utils.setResponse(ctx, utils.createResponse(ctx, { error: "Invalid API key" }));
    })
    .with({ valid: true }, async () => {
      await next();
    })
    .exhaustive();
});

// GET /products - List products with pagination
app.get("/products", async (ctx) => {
  return utils.handleResult(ctx.validated.query as ValidationResult<Record<string, string>>, ctx, {
    success: (query: Record<string, string>, ctx) => {
      const page = parseInt(query.page || "1", 10);
      const limit = 10;
      const results = Array.from(products.values())
        .slice((page - 1) * limit, page * limit);

      utils.setResponse(ctx, utils.createResponse(ctx, {
        data: results,
        _links: {
          self: `/products?page=${page}`,
          next: `/products?page=${page + 1}`,
          prev: page > 1 ? `/products?page=${page - 1}` : ''
        },
        _meta: {
          total: products.size,
          page,
          limit
        }
      }));
    },
    failure: (error: string[], ctx) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid query parameters",
        details: error
      }));
    }
  });
});

// POST /products - Create a new product
app.post<Record<string, string>, Product>("/products", async (ctx) => {
  return match(ctx.validated.body)
    .with({ ok: false }, (result) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid request data",
        details: result.error
      }));
    })
    .with({ ok: true }, (result) => {
      const validation = utils.validate(productSchema, result.value);
      
      return utils.handleResult(validation as ValidationResult<Product>, ctx, {
        success: (product: Product, ctx) => {
          const sku = product.metadata.sku;
          
          return match({ exists: products.has(sku) })
            .with({ exists: true }, () => {
              utils.setStatus(ctx, 409);
              utils.setResponse(ctx, utils.createResponse(ctx, {
                error: "Product SKU already exists"
              }));
            })
            .with({ exists: false }, () => {
              // Store product
              products.set(sku, product);
              
              // Return response with location header
              utils.setStatus(ctx, 201);
              utils.setHeader(ctx, "Location", `/products/${sku}`);
              utils.setResponse(ctx, utils.createResponse(ctx, product));
            })
            .exhaustive();
        },
        error: (error: string[], ctx) => {
          utils.setStatus(ctx, 400);
          utils.setResponse(ctx, utils.createResponse(ctx, {
            error: "Invalid product data",
            details: error
          }));
        }
      });
    })
    .exhaustive();
});

// GET /products/:sku - Get a specific product
app.get<{ sku: string }>("/products/:sku", async (ctx) => {
  return utils.handleResult(ctx.validated.params as ValidationResult<{ sku: string }>, ctx, {
    success: (params: { sku: string }, ctx) => {
      const sku = params.sku;
      const product = products.get(sku);
      
      return match({ found: !!product })
        .with({ found: false }, () => {
          utils.setStatus(ctx, 404);
          utils.setResponse(ctx, utils.createResponse(ctx, {
            error: "Product not found"
          }));
        })
        .with({ found: true }, () => {
          utils.setResponse(ctx, utils.createResponse(ctx, {
            ...product!,
            _links: {
              self: `/products/${sku}`,
              reviews: `/products/${sku}/reviews`,
              category: `/categories/${product!.category}`
            }
          }));
        })
        .exhaustive();
    },
    error: (error: string[], ctx) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid SKU format",
        details: error
      }));
    }
  });
});

// PUT /products/:sku - Update a product
app.put<{ sku: string }, Product>("/products/:sku", async (ctx) => {
  return match({
    paramsOk: ctx.validated.params.ok,
    bodyOk: ctx.validated.body.ok
  })
    .with({ paramsOk: false, bodyOk: false }, () => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid request data",
        details: ["Invalid SKU", "Invalid product data"]
      }));
    })
    .with({ paramsOk: false }, () => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid request data",
        details: ["Invalid SKU"]
      }));
    })
    .with({ bodyOk: false }, () => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid request data",
        details: ["Invalid product data"]
      }));
    })
    .with({ paramsOk: true, bodyOk: true }, () => {
      const sku = ctx.validated.params.value.sku;
      const bodyValidation = utils.validate(productSchema, ctx.validated.body.value);
      
      return utils.handleResult(bodyValidation as ValidationResult<Product>, ctx, {
        success: (update: Product, ctx) => {
          return match({ exists: products.has(sku) })
            .with({ exists: false }, () => {
              utils.setStatus(ctx, 404);
              utils.setResponse(ctx, utils.createResponse(ctx, {
                error: "Product not found"
              }));
            })
            .with({ exists: true }, () => {
              // Update product
              const existingProduct = products.get(sku)!;
              const updatedProduct = { ...existingProduct, ...update };
              products.set(sku, updatedProduct);
              
              utils.setResponse(ctx, utils.createResponse(ctx, updatedProduct));
            })
            .exhaustive();
        },
        error: (error: string[], ctx) => {
          utils.setStatus(ctx, 400);
          utils.setResponse(ctx, utils.createResponse(ctx, {
            error: "Invalid product data",
            details: error
          }));
        }
      });
    })
    .exhaustive();
});

// DELETE /products/:sku - Delete a product
app.delete<{ sku: string }>("/products/:sku", async (ctx) => {
  return utils.handleResult(ctx.validated.params as ValidationResult<{ sku: string }>, ctx, {
    success: (params: { sku: string }, ctx) => {
      const sku = params.sku;
      
      return match({ exists: products.has(sku) })
        .with({ exists: false }, () => {
          utils.setStatus(ctx, 404);
          utils.setResponse(ctx, utils.createResponse(ctx, {
            error: "Product not found"
          }));
        })
        .with({ exists: true }, () => {
          // Delete product
          products.delete(sku);
          
          utils.setStatus(ctx, 204);
          utils.setResponse(ctx, new Response(null, { status: 204 }));
        })
        .exhaustive();
    },
    error: (error: string[], ctx) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid SKU format",
        details: error
      }));
    }
  });
});

// Sample middleware for benchmarking
app.use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  console.log(`Request processed in ${duration.toFixed(2)}ms`);
});

// Error handling middleware
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
  port: port as unknown as number,
  onListen: (info: Deno.ServeHandlerInfo) => {
    const hostname = info.hostname || 'localhost';
    const actualPort = info.port || port;
    console.log(`Product API running at http://${hostname}:${actualPort}`);
  }
});
