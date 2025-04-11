# Mix Utility Functions

## Overview

Mix provides a set of utility functions to simplify common tasks in API development. These functions are designed to be composable, type-safe, and performance-optimized. They help maintain consistency across your application and reduce boilerplate code.

## Core Utility Functions

### Response Handling

#### `createResponse`

Creates a standardized response object with optional HATEOAS links and metadata.

```typescript
const response = utils.createResponse(ctx, data, options);
```

**Parameters:**
- `ctx`: The request context
- `data`: The response payload
- `options`: Optional configuration
  - `links`: HATEOAS links for the resource
  - `meta`: Additional metadata

**Examples:**

```typescript
// Basic response
const response = utils.createResponse(ctx, { 
  id: "123", 
  name: "Product Name" 
});

// With HATEOAS links
const response = utils.createResponse(ctx, product, {
  links: {
    self: `/products/${product.id}`,
    reviews: `/products/${product.id}/reviews`,
    category: `/categories/${product.category}`
  }
});

// With metadata
const response = utils.createResponse(ctx, results, {
  meta: {
    total: 100,
    page: 1,
    limit: 10
  }
});
```

#### `handleError`

Provides consistent error handling with standardized formatting.

```typescript
utils.handleError(ctx, status, message, details);
```

**Parameters:**
- `ctx`: The request context
- `status`: HTTP status code
- `message`: Error message
- `details`: Optional error details (validation errors, etc.)

**Examples:**

```typescript
// Basic error
utils.handleError(ctx, 404, "Resource not found");

// Validation error
utils.handleError(ctx, 400, "Invalid request data", [
  "Name is required",
  "Email must be valid"
]);

// Conflict error
utils.handleError(ctx, 409, "Resource already exists", {
  id: existingId
});
```

#### `createLinks`

Creates standardized HATEOAS links for resources.

```typescript
const links = utils.createLinks(resourcePath, id);
```

**Parameters:**
- `resourcePath`: The base path for the resource type
- `id`: The resource identifier

**Returns:**
- An object with `self` and `collection` links

**Examples:**

```typescript
// Create links for a product
const links = utils.createLinks('products', productId);
// Result: { self: '/products/123', collection: '/products' }

// Use in response
const response = utils.createResponse(ctx, product, {
  links: utils.createLinks('products', product.id)
});

// Extend with custom links
const links = {
  ...utils.createLinks('products', product.id),
  reviews: `/products/${product.id}/reviews`,
  related: `/products/${product.id}/related`
};
```

## Best Practices

### Consistent Error Handling

Use `handleError` for all error responses to ensure consistency:

```typescript
app.get<{ id: string }>("/products/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    handleError(ctx, 400, "Invalid product ID", ctx.validated.params.error);
    return;
  }
  
  const product = getProductById(ctx.validated.params.value.id);
  
  if (!product) {
    handleError(ctx, 404, "Product not found");
    return;
  }
  
  ctx.response = createResponse(ctx, product, { 
    links: createLinks('products', product.id) 
  });
});
```

### HATEOAS Link Generation

Use `createLinks` as a base for resource links and extend as needed:

```typescript
// Helper function for document-specific links
const getDocumentLinks = (docId: string) => ({
  ...createLinks('documents', docId),
  transitions: `/documents/${docId}/transitions`,
  history: `/documents/${docId}/history`,
  workflow: "/workflow"
});

// Use in response
ctx.response = createResponse(ctx, document, { 
  links: getDocumentLinks(document.id) 
});
```

### Type-Safe Handlers

Add explicit return type annotations to handlers for better type safety:

```typescript
app.post<Record<string, string>, Product>("/products", (ctx): void => {
  if (!ctx.validated.body.ok) {
    handleError(ctx, 400, "Invalid request data", ctx.validated.body.error);
    return;
  }
  
  // Handler implementation...
});
```

## Integration with Workflow Engine

The utility functions integrate seamlessly with the workflow engine:

```typescript
app.post("/documents/:id/transitions", (ctx): void => {
  if (!ctx.validated.params.ok || !ctx.validated.body.ok) {
    handleError(ctx, 400, "Invalid request data", [
      ...(ctx.validated.params.ok ? [] : ["Invalid document ID"]),
      ...(ctx.validated.body.ok ? [] : ["Invalid transition data"])
    ]);
    return;
  }
  
  const docId = ctx.validated.params.value.id;
  const doc = documents.get(docId);
  
  if (!doc) {
    handleError(ctx, 404, "Document not found");
    return;
  }
  
  const { event, user, comments } = ctx.validated.body.value;
  
  // Find the transition
  const transition = workflowDefinition.transitions.find(
    t => t.from === doc.state && t.on === event
  );
  
  if (!transition) {
    handleError(ctx, 400, "Invalid transition", {
      currentState: doc.state,
      requestedEvent: event
    });
    return;
  }
  
  // Process transition...
  
  // Return response with links
  ctx.response = createResponse(ctx, {
    currentState: doc.state,
    document: doc
  }, { links: getDocumentLinks(doc.id) });
});
```

## Performance Considerations

The utility functions are designed for performance:

- `handleError` and `createResponse` use direct mutation for efficiency
- `createLinks` generates minimal objects to reduce memory overhead
- All functions are optimized for minimal allocations

When used correctly, these utilities help maintain a clean, consistent API while ensuring optimal performance.
