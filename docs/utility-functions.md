# Mix Utility Functions

## Overview

Mix provides a set of utility functions to simplify common tasks in API development. These functions are designed to be composable, type-safe, and performance-optimized. They help maintain consistency across your application and reduce boilerplate code.

The utility functions now use pattern matching for more elegant and type-safe implementations, leveraging Mix's custom `match` function, which is implemented in the framework rather than imported from ArkType.

## Core Utility Functions

### Response Handling

#### `createResponse`

Creates a standardized response object with content negotiation, optional HATEOAS links, and metadata using pattern matching.

```typescript
const response = utils.createResponse(ctx, data, options);
```

**Parameters:**

- `ctx`: The request context
- `data`: The response payload
- `options`: Optional configuration
  - `links`: HATEOAS links for the resource
  - `meta`: Additional metadata
  - `template`: HTML template string for HTML responses
  - `mediaType`: Override the preferred media type from the context

**Implementation:**

```typescript
export const createResponse = (ctx: Context, data: unknown, options?: {
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  template?: string; // HTML template string
  mediaType?: MediaType; // Override content negotiation
}): Response => {
  // Determine media type (explicit override or from context)
  const mediaType = options?.mediaType || ctx.preferredMediaType;

  // Use pattern matching for different response scenarios and media types
  return match<{ mediaType: MediaType; hasLinks: boolean; hasMeta: boolean }, Response>({
    mediaType,
    hasLinks: !!options?.links,
    hasMeta: !!options?.meta
  })
    // HAL format responses
    .with({ mediaType: MediaType.HAL, hasLinks: true }, () => {
      // HAL format: https://stateless.group/hal_specification.html
      const halResponse: Record<string, unknown> = {
        ...(typeof data === 'object' && data !== null ? data : { data }),
        _links: options!.links
      };

      if (options?.meta) {
        Object.assign(halResponse, { _meta: options.meta });
      }

      return new Response(JSON.stringify(halResponse), {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.HAL }
      });
    })
    // HTML responses
    .with({ mediaType: MediaType.HTML }, () => {
      let html = renderHtml(data, options?.template);

      // Add links to HTML if provided
      if (options?.links) {
        html += '\n  <div class="links">\n    <h2>Links</h2>\n    <ul>';
        for (const [rel, href] of Object.entries(options.links as Record<string, string>)) {
          html += `\n      <li><a href="${href}">${rel}</a></li>`;
        }
        html += '\n    </ul>\n  </div>';
      }

      // Add metadata to HTML if provided
      if (options?.meta) {
        html += '\n  <div class="meta">\n    <h2>Metadata</h2>\n    <pre>' +
          JSON.stringify(options.meta, null, 2) +
          '</pre>\n  </div>';
      }

      html += '\n</body>\n</html>';

      return new Response(html, {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.HTML }
      });
    })
    // Standard JSON responses
    .with({ mediaType: MediaType.JSON, hasLinks: true, hasMeta: true }, () => {
      return new Response(JSON.stringify({
        data,
        _links: options!.links,
        _meta: options!.meta
      }), {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.JSON }
      });
    })
    // ... other cases
};
```

**Examples:**

```typescript
// Basic response (format determined by Accept header)
const response = utils.createResponse(ctx, {
  id: "123",
  name: "Product Name"
});

// Force HAL format response
const response = utils.createResponse(ctx, product, {
  links: {
    self: { href: `/products/${product.id}` },
    collection: { href: '/products' }
  },
  mediaType: MediaType.HAL
});

// HTML response with custom template
const template = `<!DOCTYPE html>
<html>
<head>
  <title>{{name}}</title>
</head>
<body>
  <h1>{{name}}</h1>
  <p>Price: ${{price}}</p>
  <p>{{description}}</p>
</body>
</html>`;

const response = utils.createResponse(ctx, product, {
  template,
  mediaType: MediaType.HTML
});

// JSON response with metadata
const response = utils.createResponse(ctx, results, {
  meta: {
    total: 100,
    page: 1,
    limit: 10
  },
  mediaType: MediaType.JSON
});
```

#### `handleError`

Provides consistent error handling with standardized formatting using pattern matching and content negotiation.

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
export const handleError = (ctx: Context, status: number, message: string, details?: unknown): Context => {
  ctx.status = status;

  // Use pattern matching for different error scenarios and media types
  ctx.response = match<{ mediaType: MediaType; hasDetails: boolean }, Response>({
    mediaType: ctx.preferredMediaType,
    hasDetails: details !== undefined
  })
    .with({ mediaType: MediaType.HTML }, () => {
      // HTML error response
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error ${status}</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .error { color: #e74c3c; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto; }
  </style>
</head>
<body>
  <h1 class="error">Error ${status}</h1>
  <p>${message}</p>
  ${details ? `<h2>Details</h2>
  <pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
</body>
</html>`;

      return new Response(errorHtml, {
        status,
        headers: { "Content-Type": MediaType.HTML }
      });
    })
    .with({ mediaType: MediaType.HAL, hasDetails: true }, () => {
      // HAL error response with details
      return new Response(JSON.stringify({
        error: message,
        details,
        _links: {
          help: { href: "/docs/errors" }
        }
      }), {
        status,
        headers: { "Content-Type": MediaType.HAL }
      });
    })
    // ... other cases

  return ctx;
};
```

**Examples:**

```typescript
// Basic error (format determined by Accept header)
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

#### `renderHtml`

Renders data as HTML using an optional template.

```typescript
const html = utils.renderHtml(data, template);
```

**Parameters:**

- `data`: The data to render
- `template`: Optional HTML template with placeholders in the format `{{key}}`

**Implementation:**

```typescript
export const renderHtml = (data: unknown, template?: string): string => {
  if (!template) {
    // Default template for automatic rendering
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mix Response</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto; }
    a { color: #0074d9; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .links { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; }
    .meta { color: #666; font-size: 0.9rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Response Data</h1>
  <pre>${JSON.stringify(data, null, 2)}</pre>
`;

    return html;
  }

  // Simple template variable replacement
  let rendered = template;
  const dataObj = typeof data === 'object' ? data : { value: data };

  for (const [key, value] of Object.entries(dataObj as Record<string, unknown>)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return rendered;
};
```

**Examples:**

```typescript
// Using default template
const html = utils.renderHtml({ name: "Product", price: 29.99 });

// Using custom template
const template = `<!DOCTYPE html>
<html>
<head>
  <title>{{name}}</title>
</head>
<body>
  <h1>{{name}}</h1>
  <p>Price: ${{price}}</p>
</body>
</html>`;

const html = utils.renderHtml({ name: "Product", price: 29.99 }, template);
```

#### `parseAcceptHeader`

Parses the Accept header to determine the preferred media type.

```typescript
const mediaType = utils.parseAcceptHeader(acceptHeader);
```

**Parameters:**

- `acceptHeader`: The Accept header string

**Returns:**

- The preferred media type (MediaType.JSON, MediaType.HAL, or MediaType.HTML)

**Implementation:**

```typescript
export const parseAcceptHeader = (acceptHeader: string | null): MediaType => {
  if (!acceptHeader) return MediaType.JSON;

  const mediaTypes = acceptHeader.split(',').map(type => {
    const [mediaType, qualityStr] = type.trim().split(';');
    const quality = qualityStr ? parseFloat(qualityStr.split('=')[1]) : 1.0;
    return { mediaType: mediaType.trim(), quality };
  }).sort((a, b) => b.quality - a.quality);

  for (const { mediaType } of mediaTypes) {
    if (mediaType === MediaType.HAL) return MediaType.HAL;
    if (mediaType === MediaType.HTML) return MediaType.HTML;
    if (mediaType === MediaType.JSON) return MediaType.JSON;
    if (mediaType === MediaType.ANY) return MediaType.JSON; // Default to JSON for */*
  }

  return MediaType.JSON; // Default to JSON if no match
};
```

**Examples:**

```typescript
// Parse Accept header
const mediaType = utils.parseAcceptHeader('text/html,application/xhtml+xml,application/xml;q=0.9');
// Returns MediaType.HTML

const mediaType = utils.parseAcceptHeader('application/hal+json');
// Returns MediaType.HAL

const mediaType = utils.parseAcceptHeader('application/json');
// Returns MediaType.JSON

const mediaType = utils.parseAcceptHeader('*/*');
// Returns MediaType.JSON (default)
```

## Content Negotiation

Mix supports content negotiation to serve responses in different formats based on the client's Accept header:

- **application/json**: Standard JSON responses
- **application/hal+json**: HAL format for hypermedia APIs
- **text/html**: HTML responses for browser clients

The framework automatically determines the preferred format from the Accept header and formats the response accordingly. You can also explicitly override the format using the `mediaType` option in `createResponse`.

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
