# Product Catalog API Example

This example demonstrates a simple product catalog API without HATEOAS support. It focuses on basic CRUD operations for products with proper validation and error handling.

## **Type-Safe Validation**

```typescript
// Product type definition with strong typing
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

// Type-safe category enumeration
type ProductCategory = 'electronics' | 'books' | 'clothing' | 'home' | 'sports';
```

## **Clean JSON Responses**

```typescript
// Simple, clean JSON response without HATEOAS links
ctx.response = createResponse(ctx, {
  products: results,
  metadata: {
    total: filteredProducts.length,
    page,
    limit,
    pages: Math.ceil(filteredProducts.length / limit)
  }
});
```

## **RESTful Endpoints**

| Method | Path                  | Description                    |
|--------|----------------------|--------------------------------|
| GET    | /products             | Paginated & filtered products  |
| GET    | /products/search      | Search products by text        |
| GET    | /products/categories  | List all product categories    |
| GET    | /products/{id}        | Get product details by ID      |
| POST   | /products             | Create a new product           |
| PUT    | /products/{id}        | Update an existing product     |
| DELETE | /products/{id}        | Delete a product               |

## **Error Handling**

```typescript
// Consistent error handling with utility function
if (!products.has(productId)) {
  handleError(ctx, 404, "Product not found");
  return;
}

// Validation error handling
if (updateData.id || updateData.createdAt) {
  handleError(ctx, 400, "Cannot update immutable fields (id, createdAt)");
  return;
}

// Global error handler in middleware
try {
  await next();

  // 404 handler
  if (!ctx.response) {
    handleError(ctx, 404, "Endpoint not found");
  }
} catch (err) {
  console.error("API Error:", err);
  handleError(ctx, 500, "Internal server error", { requestId: crypto.randomUUID() });
}
```

## **Performance Tracking**

```typescript
// Performance tracking middleware
const start = performance.now();

try {
  await next();
  // ... handle the request
} finally {
  const duration = performance.now() - start;
  console.log(`Request processed in ${duration.toFixed(2)}ms`);
}
```

## Testing the API

**Create Product:**

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bluetooth Headphones",
    "description": "Noise cancelling wireless headphones",
    "price": 149.99,
    "category": "electronics",
    "inStock": true,
    "quantity": 30
  }'
```

**Get Product by ID:**

```bash
curl http://localhost:3000/products/p001
```

**Search Products:**

```bash
curl http://localhost:3000/products/search?q=mouse
```

**Get Categories:**

```bash
curl http://localhost:3000/products/categories
```

**Update Product:**

```bash
curl -X PUT http://localhost:3000/products/p001 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 24.99,
    "quantity": 75
  }'
```

**Delete Product:**

```bash
curl -X DELETE http://localhost:3000/products/p001
```

**Paginated & Filtered List:**

```bash
curl http://localhost:3000/products?page=1&limit=5&category=electronics
```

## Features Demonstrated

This example showcases Mixon's capabilities for building:

- Type-safe REST APIs with TypeScript interfaces
- Comprehensive CRUD operations
- Validation-driven endpoints with proper error handling
- Clean JSON responses without HATEOAS complexity
- Performance tracking middleware
- Search and filtering functionality
- Pagination with metadata

## Running the Example

```bash
deno run --allow-net examples/product/product-api.ts
```

Then visit <http://localhost:3000/products> in your browser or use the curl commands above to interact with the API.
