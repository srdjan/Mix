<div align="center">

# Mixon 🚀

[![JSR](https://jsr.io/badges/@srdjan/mixon)](https://jsr.io/@srdjan/mixon)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-24292e.svg?style=flat&logo=github)](https://github.com/srdjan/Mixon)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**A lightweight, type-safe microframework for building modern web applications and APIs in Deno**

*Combining the simplicity of minimal frameworks with powerful features like runtime type validation, elegant pattern matching, content negotiation, and HATEOAS support*

</div>

## Why Mixon? 🤔

Mixon is designed for developers who want the **simplicity of minimal frameworks** but need **powerful features** for building robust APIs and applications. It's perfect for:

- Building truly RESTful APIs with HATEOAS support
- Creating interactive web applications with minimal JavaScript
- Implementing complex workflows with state machines
- Ensuring type safety throughout your application

All with a tiny footprint (<5KB) and zero dependencies.

## Quick Start ⚡

```typescript
import { App } from "jsr:@srdjan/mixon";

const app = App();
const { createResponse } = app.utils;

// Type-safe route parameters
app.get<{ id: string }>("/products/:id", (ctx) => {
  const productId = ctx.validated.params.value.id;
  const product = { id: productId, name: "Product", price: 29.99 };

  // Content negotiation & HATEOAS links
  ctx.response = createResponse(ctx, product, {
    links: {
      self: `/products/${productId}`,
      collection: "/products",
      related: `/products/${productId}/related`
    }
  });
});

app.listen(3000);
```

## Features Comparison 📊

| Feature | Express/Koa | Hono | Oak | **Mixon** |
|---------|------------|------|-----|--------|
| **Size** | 57KB+ | 14KB | 19KB | **<5KB** |
| **Runtime Type Validation** | ❌ | ❌ | ❌ | ✅ |
| **Pattern Matching** | ❌ | ❌ | ❌ | ✅ |
| **Content Negotiation** | ❌ | ❌ | ❌ | ✅ |
| **HATEOAS Support** | ❌ | ❌ | ❌ | ✅ |
| **Workflow Engine** | ❌ | ❌ | ❌ | ✅ |
| **HTMX Integration** | ❌ | ❌ | ❌ | ✅ |
| **TypeScript-First** | ❌ | ✅ | ✅ | ✅ |
| **Deno Native** | ❌ | ✅ | ✅ | ✅ |

## Core Features ✨

- **Type-Safe Everything** - From route params to workflow states - TypeScript first
- **ArkType Integration** - Runtime validation with perfect type inference
- **Custom Pattern Matching** - Built-in elegant, type-safe pattern matching with exhaustiveness checking
- **Content Negotiation** - Automatic format selection based on Accept header (JSON, HAL, HTML)
- **HTMX Integration** - Build interactive UIs with minimal JavaScript
- **HATEOAS Ready** - Built-in hypermedia support with `createLinks` utility
- **Workflow Engine** - State machines with audit trails
- **Consistent Error Handling** - Standardized error responses with `handleError` utility
- **Elegant Response Creation** - Clean API responses with `createResponse` utility
- **Lightweight Core** - <5KB base, zero dependencies
- **Deno Native** - ES Modules, top-level await, modern JS

## Installation 📦

```typescript
// Import directly from JSR (recommended)
import { App } from "jsr:@srdjan/mixon";

// Or import specific utilities
import { App, type, match } from "jsr:@srdjan/mixon";
```

No npm install or package.json needed - Deno handles everything for you!

## Examples 🧪

### Basic API Server

```typescript
import { App } from "jsr:@srdjan/mixon";

const app = App();

app.get("/hello", (ctx) => {
  ctx.response = new Response("Hello World");
});

app.listen(3000);
```

### Type-Safe Validation

```typescript
import { App, type } from "jsr:@srdjan/mixon";

const app = App();

// Define a schema with ArkType
const userSchema = type({
  name: "string",
  email: "string",
  age: "number>0"
});

app.post("/users", (ctx) => {
  // Automatic validation
  if (!ctx.validated.body.ok) {
    return app.utils.handleError(ctx, 400, "Invalid user data", ctx.validated.body.error);
  }

  // Type-safe access to validated data
  const user = ctx.validated.body.value;

  // Process the user...
  ctx.response = app.utils.createResponse(ctx, { id: "123", ...user });
});

app.listen(3000);
```

### HATEOAS API with Content Negotiation

```typescript
import { App, MediaType } from "jsr:@srdjan/mixon";

const app = App();
const { createResponse } = app.utils;

app.get("/products/:id", (ctx) => {
  const product = { id: "123", name: "Product", price: 29.99 };

  // Response format changes based on Accept header
  ctx.response = createResponse(ctx, product, {
    links: {
      self: `/products/${product.id}`,
      collection: "/products",
      related: `/products/${product.id}/related`
    }
  });

  // Will return:
  // - HAL+JSON if Accept: application/hal+json
  // - HTML if Accept: text/html
  // - JSON otherwise
});

app.listen(3000);
```

### Pattern Matching

```typescript
import { App, match } from "jsr:@srdjan/mixon";

const app = App();

app.get("/status/:code", (ctx) => {
  const code = parseInt(ctx.validated.params.value.code);

  const message = match(code)
    .with(200, () => "OK")
    .with(404, () => "Not Found")
    .with(500, () => "Server Error")
    .when(c => c >= 400 && c < 500, () => "Client Error")
    .otherwise(() => "Unknown Status");

  ctx.response = new Response(message);
});

app.listen(3000);
```

### Workflow State Machine

```typescript
import { App } from "jsr:@srdjan/mixon";

const app = App();
const workflow = app.workflow();

// Define an order workflow
workflow.define({
  name: "order",
  initialState: "pending",
  states: ["pending", "paid", "shipped", "delivered", "cancelled"],
  transitions: [
    { from: "pending", to: "paid", on: "payment_received" },
    { from: "pending", to: "cancelled", on: "cancel" },
    { from: "paid", to: "shipped", on: "ship" },
    { from: "shipped", to: "delivered", on: "deliver" }
  ]
});

// Create an order instance
const orderId = "order-123";
workflow.createInstance("order", orderId);

// Handle state transitions
app.post("/orders/:id/pay", (ctx) => {
  const id = ctx.validated.params.value.id;

  if (workflow.transition(id, "payment_received")) {
    ctx.response = new Response("Order paid successfully");
  } else {
    app.utils.handleError(ctx, 400, "Invalid transition");
  }
});

app.listen(3000);
```

## Documentation 📚

For full documentation, visit the [GitHub repository](https://github.com/srdjan/Mixon).

## License 📄

MIT License
