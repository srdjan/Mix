/**
 * Product Catalog API Example
 *
 * This example demonstrates a simple product catalog API without HATEOAS support.
 * It focuses on basic CRUD operations for products with proper validation and error handling.
 */

import { App } from "../../lib/server/mixon.ts";

// Product types
type ProductCategory = 'electronics' | 'books' | 'clothing' | 'home' | 'sports';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  inStock: boolean;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

// Mock Database
const products = new Map<string, Product>();

// Seed with some initial products
products.set("p001", {
  id: "p001",
  name: "Wireless Mouse",
  description: "Ergonomic wireless mouse with long battery life",
  price: 29.99,
  category: "electronics",
  inStock: true,
  quantity: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

products.set("p002", {
  id: "p002",
  name: "Mechanical Keyboard",
  description: "Mechanical keyboard with RGB lighting",
  price: 89.99,
  category: "electronics",
  inStock: true,
  quantity: 25,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

products.set("p003", {
  id: "p003",
  name: "Yoga Mat",
  description: "Non-slip yoga mat for home workouts",
  price: 24.99,
  category: "sports",
  inStock: true,
  quantity: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Initialize the app
const app = App();
const { utils } = app;
const { handleError, createResponse } = utils;

// Middleware for logging and error handling
app.use(async (ctx, next) => {
  console.log(`[${new Date().toISOString()}] ${ctx.request.method} ${new URL(ctx.request.url).pathname}`);

  // Performance tracking
  const start = performance.now();

  try {
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

// GET /products - List products with pagination and filtering
app.get("/products", (ctx): void => {
  if (!ctx.validated.query.ok) {
    handleError(ctx, 400, "Invalid query parameters", ctx.validated.query.error);
    return;
  }

  const query = ctx.validated.query.value;
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const category = query.category as ProductCategory | undefined;

  // Filter products by category if provided
  let filteredProducts = Array.from(products.values());
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const results = filteredProducts.slice(startIndex, startIndex + limit);

  // Return paginated results with metadata
  ctx.response = createResponse(ctx, {
    products: results,
    metadata: {
      total: filteredProducts.length,
      page,
      limit,
      pages: Math.ceil(filteredProducts.length / limit)
    }
  });
});

// POST /products - Create a new product
app.post("/products", (ctx): void => {
  if (!ctx.validated.body.ok) {
    handleError(ctx, 400, "Invalid request data", ctx.validated.body.error);
    return;
  }

  // Get the product data from the request body
  const productData = ctx.validated.body.value as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

  // Generate a new product ID
  const productId = `p${Date.now().toString().slice(-6)}`;

  // Check if product ID already exists (unlikely but possible)
  if (products.has(productId)) {
    handleError(ctx, 409, "Product ID already exists, please try again");
    return;
  }

  // Create the complete product with generated fields
  const now = new Date().toISOString();
  const newProduct: Product = {
    id: productId,
    ...productData,
    createdAt: now,
    updatedAt: now
  };

  // Store product
  products.set(productId, newProduct);

  // Return response with location header
  ctx.status = 201;
  ctx.headers.set("Location", `/products/${productId}`);
  ctx.response = createResponse(ctx, newProduct);
});

// GET /products/:id - Get a specific product by ID
app.get("/products/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    handleError(ctx, 400, "Invalid product ID format", ctx.validated.params.error);
    return;
  }

  const productId = ctx.validated.params.value.id;
  const product = products.get(productId);

  if (!product) {
    handleError(ctx, 404, "Product not found");
    return;
  }

  // Return the product without HATEOAS links
  ctx.response = createResponse(ctx, product);
});

// PUT /products/:id - Update a product
app.put("/products/:id", (ctx): void => {
  // Validate request parameters
  const errors = [];

  if (!ctx.validated.params.ok) errors.push("Invalid product ID");
  if (!ctx.validated.body.ok) errors.push("Invalid product data");

  if (errors.length > 0) {
    handleError(ctx, 400, "Invalid request data", errors);
    return;
  }

  // TypeScript doesn't understand that we've already checked ctx.validated.params.ok
  const params = ctx.validated.params as { ok: true; value: { id: string } };
  const body = ctx.validated.body as { ok: true; value: Partial<Product> };

  const productId = params.value.id;
  const updateData = body.value;

  // Check if product exists
  if (!products.has(productId)) {
    handleError(ctx, 404, "Product not found");
    return;
  }

  // Prevent updating immutable fields
  if (updateData.id || updateData.createdAt) {
    handleError(ctx, 400, "Cannot update immutable fields (id, createdAt)");
    return;
  }

  // Update product
  const existingProduct = products.get(productId)!;
  const updatedProduct = {
    ...existingProduct,
    ...updateData,
    updatedAt: new Date().toISOString() // Always update the updatedAt timestamp
  };

  products.set(productId, updatedProduct);

  ctx.response = createResponse(ctx, updatedProduct);
});

// DELETE /products/:id - Delete a product
app.delete("/products/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    handleError(ctx, 400, "Invalid product ID format", ctx.validated.params.error);
    return;
  }

  // TypeScript doesn't understand that we've already checked ctx.validated.params.ok
  const params = ctx.validated.params as { ok: true; value: { id: string } };
  const productId = params.value.id;

  if (!products.has(productId)) {
    handleError(ctx, 404, "Product not found");
    return;
  }

  // Delete product
  products.delete(productId);

  // Return empty response with 204 status (No Content)
  ctx.status = 204;
  ctx.response = new Response(null, { status: 204 });
});

// GET /products/search - Search products by name or description
app.get("/products/search", (ctx): void => {
  if (!ctx.validated.query.ok) {
    handleError(ctx, 400, "Invalid query parameters", ctx.validated.query.error);
    return;
  }

  const query = ctx.validated.query.value;
  const searchTerm = query.q?.toLowerCase() || "";

  if (!searchTerm) {
    handleError(ctx, 400, "Search term (q) is required");
    return;
  }

  // Search products by name or description
  const results = Array.from(products.values()).filter(product =>
    product.name.toLowerCase().includes(searchTerm) ||
    product.description.toLowerCase().includes(searchTerm)
  );

  // Return search results
  ctx.response = createResponse(ctx, {
    query: searchTerm,
    results,
    count: results.length
  });
});

// GET /products/categories - Get all product categories
app.get("/products/categories", (ctx): void => {
  // Extract unique categories from products
  const categories = new Set<ProductCategory>();
  for (const product of products.values()) {
    categories.add(product.category);
  }

  // Return categories
  ctx.response = createResponse(ctx, {
    categories: Array.from(categories),
    count: categories.size
  });
});

// In a real application, we would start the server with:
const port = 3000;
app.listen(port);
console.log(`Product API running at http://localhost:${port}`);
console.log(`Try these endpoints:\n
- GET /products\n- GET /products/search?q=mouse\n- GET /products/categories\n- GET /products/p001\n- POST /products\n- PUT /products/p001\n- DELETE /products/p001\n`);
