# Mix Utility Functions

## Overview

Mix provides a set of utility functions to simplify common tasks in API development. These functions are designed to be composable, type-safe, and performance-optimized. They help maintain consistency across your application and reduce boilerplate code.

The utility functions now use pattern matching for more elegant and type-safe implementations, leveraging Mix's custom `match` function, which is implemented in the framework rather than imported from ArkType.

## Core Utility Functions

### Response Handling

#### `createResponse`

Creates a standardized response object with optional HATEOAS links and metadata using pattern matching.

```typescript
const response = utils.createResponse(ctx, data, options);
```

**Parameters:**

- `ctx`: The request context
- `data`: The response payload
- `options`: Optional configuration
  - `links`: HATEOAS links for the resource
  - `meta`: Additional metadata

**Implementation:**

```typescript
const createResponse = (ctx: Context, data: unknown, options?: {
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>
}): Response => {
  // Use pattern matching for different response scenarios
  return match<{ hasOptions: boolean; hasLinks: boolean; hasMeta: boolean }, Response>({
    hasOptions: !!options,
    hasLinks: !!options?.links,
    hasMeta: !!options?.meta
  })
    .with({ hasOptions: false }, () => {
      return new Response(JSON.stringify({ data }), {
        status: ctx.status || 200,
        headers: { "Content-Type": "application/json" }
      });
    })
    .with({ hasLinks: true, hasMeta: true }, () => {
      return new Response(JSON.stringify({
        data,
        _links: options!.links,
        _meta: options!.meta
      }), {
        status: ctx.status || 200,
        headers: { "Content-Type": "application/json" }
      });
    })
    .with({ hasLinks: true, hasMeta: false }, () => {
      return new Response(JSON.stringify({
        data,
        _links: options!.links
      }), {
        status: ctx.status || 200,
        headers: { "Content-Type": "application/json" }
      });
    })
    .with({ hasLinks: false, hasMeta: true }, () => {
      return new Response(JSON.stringify({
        data,
        _meta: options!.meta
      }), {
        status: ctx.status || 200,
        headers: { "Content-Type": "application/json" }
      });
    })
    .exhaustive();
};
```

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

Provides consistent error handling with standardized formatting using pattern matching.

```typescript
utils.handleError(ctx, status, message, details);
```

**Parameters:**

- `ctx`: The request context
- `status`: HTTP status code
- `message`: Error message
- `details`: Optional error details (validation errors, etc.)

**Implementation:**

```typescript
const handleError = (ctx: Context, status: number, message: string, details?: unknown): Context => {
  ctx.status = status;

  // Use pattern matching for different error scenarios
  ctx.response = match<{ status: number; hasDetails: boolean }, Response>({ status, hasDetails: details !== undefined })
    .with({ hasDetails: true }, () => {
      return new Response(JSON.stringify({ error: message, details }), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    })
    .with({ hasDetails: false }, () => {
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    })
    .exhaustive();

  return ctx;
};
```

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

Creates standardized HATEOAS links for resources using pattern matching.

```typescript
const links = utils.createLinks(resourcePath, id);
```

**Parameters:**

- `resourcePath`: The base path for the resource type
- `id`: The resource identifier

**Returns:**

- An object with `self` and `collection` links

**Implementation:**

```typescript
const createLinks = (resourcePath: string, id: string): Record<string, string> => {
  // Use pattern matching to handle different resource path formats
  return match<{ hasLeadingSlash: boolean }, Record<string, string>>({ hasLeadingSlash: resourcePath.startsWith('/') })
    .with({ hasLeadingSlash: true }, () => ({
      self: `${resourcePath}/${id}`,
      collection: resourcePath
    }))
    .with({ hasLeadingSlash: false }, () => ({
      self: `/${resourcePath}/${id}`,
      collection: `/${resourcePath}`
    }))
    .exhaustive();
};
```

**Examples:**

```typescript
// Create links for a product
const links = utils.createLinks('products', productId);
// Result: { self: '/products/123', collection: '/products' }

// With leading slash
const links = utils.createLinks('/products', productId);
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

## Pattern Matching

The utility functions use Mix's custom `match` function for pattern matching, which provides several benefits:

1. **Type Safety**: Pattern matching with exhaustiveness checking ensures all cases are handled
2. **Readability**: Clear, declarative code that's easier to understand
3. **Maintainability**: Easier to add new cases or modify existing ones
4. **Consistency**: Standardized approach to handling different scenarios

### Custom `match` Function Implementation

After evaluating options, we decided to implement our own pattern matching function rather than using ArkType's `match`. This custom implementation provides a fluent API for pattern matching with type safety and is more concise for our specific use cases:

```typescript
// Custom pattern matching implementation
type MatchResult<T, R> = {
  with: <P>(pattern: P, handler: (value: T) => R) => MatchResult<T, R>;
  when: (predicate: (value: T) => boolean, handler: () => R) => MatchResult<T, R>;
  otherwise: (fallback: () => R) => R;
  exhaustive: () => R;
};

const match = <T, R>(value: T): MatchResult<T, R> => {
  let matched = false;
  let result: R | undefined;

  const matchResult: MatchResult<T, R> = {
    with<P>(pattern: P, handler: (value: T) => R): MatchResult<T, R> {
      if (matched) return matchResult;

      if (typeof pattern === 'object' && pattern !== null) {
        const isMatch = Object.entries(pattern as Record<string, unknown>).every(([key, pValue]) => {
          const typedValue = value as Record<string, unknown>;
          if (typeof pValue === 'function' && pValue === match.array) {
            return Array.isArray(typedValue[key]);
          }
          return typedValue[key] === pValue;
        });

        if (isMatch) {
          matched = true;
          result = handler(value);
        }
      } else if (value === (pattern as unknown)) {
        matched = true;
        result = handler(value);
      }

      return matchResult;
    },

    when(predicate: (value: T) => boolean, handler: () => R): MatchResult<T, R> {
      if (matched) return matchResult;

      if (predicate(value)) {
        matched = true;
        result = handler();
      }

      return matchResult;
    },

    otherwise(fallback: () => R): R {
      return matched ? result! : fallback();
    },

    exhaustive(): R {
      if (!matched) {
        throw new Error(`Non-exhaustive pattern matching for: ${JSON.stringify(value)}`);
      }
      return result!;
    }
  };

  return matchResult;
};

// Helper for checking arrays in pattern matching
match.array = (): unknown => true;
```

### Using the `match` Function

```typescript
const result = match<InputType, OutputType>(value)
  .with(pattern1, handler1)
  .with(pattern2, handler2)
  .otherwise(fallbackHandler);
```

Or with exhaustiveness checking:

```typescript
const result = match<InputType, OutputType>(value)
  .with(pattern1, handler1)
  .with(pattern2, handler2)
  .exhaustive(); // Throws if no pattern matches
```

### Pattern Matching Examples

```typescript
// Match on object properties
const result = match({ type: 'success', data: 123 })
  .with({ type: 'success' }, (res) => `Success: ${res.data}`)
  .with({ type: 'error' }, (res) => `Error: ${res.message}`)
  .exhaustive();

// Match on primitive values
const status = match(statusCode)
  .with(200, () => 'OK')
  .with(404, () => 'Not Found')
  .with(500, () => 'Server Error')
  .otherwise(() => 'Unknown Status');

// Match with predicates
const message = match(value)
  .when(v => typeof v === 'string' && v.length > 10, () => 'Long string')
  .when(v => typeof v === 'number' && v > 100, () => 'Large number')
  .otherwise(() => 'Other value');
```

## Best Practices

### Consistent Error Handling

Use `handleError` with pattern matching for all error responses to ensure consistency:

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
