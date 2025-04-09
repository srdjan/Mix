# Key Features Demonstrated

## **Type-Safe Validation**

```typescript
// Schema with nested validation
const productSchema = scope({
  name: "string>3",
  price: "number>0",
  category: "'electronics'|'books'|'clothing'",
  metadata: {
    sku: /^[A-Z]{3}-d{4}$/ // ABC-1234 format
  }
}).compile();
```

## **HATEOAS Support**

```typescript
// Response with navigation links
ctx.json({
  data: results,
  _links: {
    self: `/products?page=${page}`,
    next: `/products?page=${page + 1}`,
    prev: page > 1 ? `/products?page=${page - 1}` : undefined
  }
});
```

## **RESTful Endpoints**

| Method | Path              | Description               |
|--------|-------------------|---------------------------|
| GET    | /products         | Paginated product list    |
| POST   | /products         | Create new product        |
| GET    | /products/{sku}   | Product details           |
| PUT    | /products/{sku}   | Update product            |

## **Error Handling**

```typescript
// Custom error responses
ctx.status = 409;
ctx.json({ error: "Product SKU already exists" });

// Global error handler
ctx.json({ 
  error: "Internal server error",
  requestId: "a1b2c3d4" 
});
```

## **Security**

```typescript
// API Key authentication middleware
const apiKey = ctx.request.headers.get("X-API-Key");
if (apiKey !== Deno.env.get("API_KEY")) {
  ctx.status = 401;
  return ctx.json({ error: "Invalid API key" });
}
```

### Testing the API

**Create Product:**

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "name": "Mechanical Keyboard",
    "price": 129.99,
    "category": "electronics",
    "inStock": true,
    "metadata": {
      "tags": ["tech", "input"],
      "sku": "KEY-5678"
    }
  }'
```

**Get Product:**

```bash
curl http://localhost:3000/products/KEY-5678
```

**Update Product:**

```bash
curl -X PUT http://localhost:3000/products/KEY-5678 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"price": 139.99}'
```

**Paginated List:**

```bash
curl http://localhost:3000/products?page=2
```

This example showcases Bix's capabilities for building:

- Type-safe REST APIs
- Validation-driven endpoints
- HATEOAS-compliant responses
- Enterprise-grade error handling
- Secure authentication flows
- Clean project organization

The API can be extended with additional features like:

- Rate limiting
- Caching headers
- OpenAPI documentation
- Database integration
- Search endpoints
- Category-specific routes
