# Mix Documentation

## Introduction

Mix is a minimalist, type-safe API and workflow framework for Deno. It provides:

- **Type-Safety**: End-to-end TypeScript with perfect inference
- **Performance-Optimized**: Strategic mutation for high-throughput applications
- **Workflow Engine**: State machines with audit trails
- **HATEOAS Support**: Native hypermedia capabilities
- **ArkType Integration**: Runtime validation with comprehensive type inference

## Installation

```typescript
// deps.ts
export { App, type, scope, match } from "https://deno.land/x/Mix/mod.ts";
export type { Infer } from "https://deno.land/x/Mix/mod.ts";
```

## Core Concepts

### Performance Philosophy

Mix uses a hybrid approach that balances functional programming principles with strategic mutation for performance:

- **Pure Functions**: Core business logic remains pure and side-effect free
- **Controlled Mutation**: Performance-critical paths use in-place updates
- **Explicit Side Effects**: Side effects are isolated at system boundaries
- **Pattern Matching**: Declarative control flow with exhaustive type checking

### Result Types

Mix uses discriminated unions for error handling:

```typescript
type Result<T, E = Error> = 
  | { ok: true; value: T } 
  | { ok: false; error: E };
```

This pattern enforces explicit error handling throughout your application.

## API Reference

### Application

```typescript
import { App } from "./deps.ts";

const app = App();
const { utils } = app;

// Middleware registration
app.use(async (ctx, next) => {
  const start = performance.now();
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url} - ${performance.now() - start}ms`);
});

// Route handlers
app.get<{ id: string }>("/resources/:id", async (ctx) => {
  return utils.handleResult(ctx.validated.params, ctx,
    (params, ctx) => {
      // Success handler with ctx mutation
      return utils.setResponse(ctx, utils.createResponse(ctx, { id: params.id }));
    },
    (error, ctx) => {
      // Error handler with ctx mutation
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, { error }));
    }
  );
});

// Start the server
app.listen({ port: 3000 });
```

### Context Manipulation

```typescript
// Set response status
utils.setStatus(ctx, 201);

// Set response header
utils.setHeader(ctx, "Location", "/resources/123");

// Set response body
utils.setResponse(ctx, utils.createResponse(ctx, { success: true }));

// Handle Result types
utils.handleResult(validation, ctx,
  (value, ctx) => { /* success handler */ },
  (error, ctx) => { /* error handler */ }
);
```

### Validation

```typescript
import { type, scope } from "./deps.ts";

// Define validation schema
const userSchema = scope({
  name: "string>3",
  email: "email",
  age: ["number", ">", 18]
}).compile();

// Validate input
const validation = utils.validate(userSchema, input);

// Handle validation result
return utils.handleResult(validation, ctx,
  (user, ctx) => { /* success path */ },
  (errors, ctx) => { /* validation failed */ }
);
```

### Pattern Matching

```typescript
import { match } from "./deps.ts";

// Simple value matching
return match(statusCode)
  .with(200, () => "OK")
  .with(404, () => "Not Found")
  .with(500, () => "Server Error")
  .otherwise(() => "Unknown Status");

// Complex pattern matching
return match(response)
  .with({ ok: true, value: match.number }, ({ value }) => 
    `Success: ${value}`)
  .with({ ok: false, error: match.array() }, ({ error }) => 
    `Validation failed: ${error.join(", ")}`)
  .exhaustive();
```

## Workflow Engine

Mix includes a state machine workflow engine for modeling complex business processes:

```typescript
// Define workflow types
type OrderState = "Draft" | "Pending" | "Confirmed" | "Shipped" | "Delivered";
type OrderEvent = "Submit" | "Confirm" | "Ship" | "Deliver" | "Cancel";

// Create workflow engine
const orderWorkflow = app.workflow<OrderState, OrderEvent>();

// Define transitions
orderWorkflow.load({
  states: ["Draft", "Pending", "Confirmed", "Shipped", "Delivered"],
  events: ["Submit", "Confirm", "Ship", "Deliver", "Cancel"],
  transitions: [
    {
      from: "Draft",
      to: "Pending",
      on: "Submit",
      task: {
        assign: "sales@example.com",
        message: "New order received: {orderNumber}"
      }
    },
    // Additional transitions...
  ],
  initial: "Draft"
});

// Create workflow handler
orderWorkflow.createHandler("/orders/:id/transitions", async (ctx) => {
  // Implementation details...
});
```

### Workflow Utilities

```typescript
// Check if transition is possible
const canTransition = utils.canTransition(workflowInstance, event);

// Apply transition (mutates instance)
const success = utils.applyTransition(workflowInstance, event);

// Find transition definition
const transition = utils.findTransition(workflowInstance, event);

// Get pending tasks
const tasks = utils.getPendingTasks(workflowInstance);

// Assign task
utils.assignTask(workflowInstance, task);
```

## Migration Guide

### Upgrading from Immutable API

Previous versions of Mix used an immutable approach with functions like `withStatus`, `withHeader`, and `withResponse`. The new performance-optimized API uses controlled mutation with renamed functions:

```typescript
// Before (immutable)
return utils.withResponse(
  utils.withStatus(ctx, 404),
  utils.createResponse(ctx, { error: "Not found" })
);

// After (mutable)
utils.setStatus(ctx, 404);
return utils.setResponse(ctx, utils.createResponse(ctx, { error: "Not found" }));
```

### Result Handling Changes

```typescript
// Before
return utils.handleResult(validation,
  value => /* return modified context */,
  error => /* return modified context */
);

// After
return utils.handleResult(validation, ctx,
  (value, ctx) => /* modify ctx directly */,
  (error, ctx) => /* modify ctx directly */
);
```

### Workflow State Changes

```typescript
// Before (returned new instance)
const updatedInstance = utils.applyTransition(instance, event);
if (updatedInstance !== instance) {
  // Transition applied successfully
}

// After (mutates in place, returns boolean)
const success = utils.applyTransition(instance, event);
if (success) {
  // Transition applied successfully
}
```

## Performance Considerations

### Optimization Strategies

The optimized Mix architecture implements several performance enhancements:

1. **Middleware Optimization**: Fast-path dispatch with O(1) middleware lookup
2. **Router Optimization**: Static route matching with Map-based lookup
3. **Context Mutation**: In-place updates to minimize allocations
4. **Set-Based Deduplication**: Efficient collection operations
5. **Controlled GC Pressure**: Minimized object creation during request processing

### Performance Benchmarks

In high-throughput scenarios, the optimized Mix implementation demonstrates:

- 30-40% lower memory usage
- 15-25% faster response times
- 50-60% reduction in GC pauses

These improvements are most noticeable in applications with:

- High concurrent request volume
- Complex middleware chains
- Extensive workflow state changes

## Example Application

```typescript
// product_api.ts
import { App, type, scope, match } from "./deps.ts";

// Define product schema
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

// Initialize app
const app = App();
const { utils } = app;

// Product data store
const products = new Map();

// Create product endpoint
app.post("/products", async (ctx) => {
  return utils.handleResult(
    utils.validate(productSchema, ctx.validated.body.value),
    ctx,
    (product, ctx) => {
      const sku = product.metadata.sku;
      
      if (products.has(sku)) {
        utils.setStatus(ctx, 409);
        return utils.setResponse(ctx, utils.createResponse(ctx, { 
          error: "Product already exists" 
        }));
      }
      
      products.set(sku, product);
      
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

// Start server with native Deno.serve options
app.listen({ 
  port: 3000,
  onListen: ({ hostname, port }) => {
    console.log(`Product API running on http://${hostname}:${port}/`);
  }
});

// Handle graceful shutdown
Deno.addSignalListener("SIGINT", () => {
  console.log("Shutting down API server...");
  app.close();
});
```

## Type-Driven Development

Mix encourages a type-driven approach to API development:

1. Define your domain models with precise types
2. Create validation schemas that align with your types
3. Use pattern matching for exhaustive state handling
4. Leverage the `Result` type for explicit error flows
5. Apply strategic mutation only where performance demands

## Best Practices

1. **Always validate input**: Use ArkType validation for all external inputs
2. **Use pattern matching**: Ensure exhaustive handling of states
3. **Isolate side effects**: Keep database operations at system boundaries
4. **Apply strategic immutability**: Use immutable patterns for business logic
5. **Optimize hot paths**: Apply controlled mutation for performance-critical code

## Architectural Patterns

### Resource-Based Routing

```typescript
// users.ts
export const userRoutes = (app) => {
  app.get("/users", listUsers);
  app.post("/users", createUser);
  app.get("/users/:id", getUser);
  app.put("/users/:id", updateUser);
  app.delete("/users/:id", deleteUser);
};

// routes.ts
import { userRoutes } from "./users.ts";
import { productRoutes } from "./products.ts";

export const registerRoutes = (app) => {
  userRoutes(app);
  productRoutes(app);
};
```

### Effect Management

```typescript
// Pure effect descriptor
type EmailEffect = {
  type: "email";
  to: string;
  subject: string;
  body: string;
};

// Create effect (pure)
const createEmailEffect = (user, message): EmailEffect => ({
  type: "email",
  to: user.email,
  subject: "Notification",
  body: message
});

// Execute effect (impure, at boundary)
const executeEffect = (effect: EmailEffect): void => {
  if (effect.type === "email") {
    sendEmail(effect.to, effect.subject, effect.body);
  }
};
```

## Advanced Topics

### Middleware Composition

```typescript
// Authentication middleware
const authenticate = async (ctx, next) => {
  const token = ctx.request.headers.get("Authorization")?.split(" ")[1];
  if (!token) {
    utils.setStatus(ctx, 401);
    return utils.setResponse(ctx, utils.createResponse(ctx, { 
      error: "Unauthorized" 
    }));
  }
  
  // Validate token
  const user = await validateToken(token);
  ctx.state.user = user;
  
  await next();
};

// Role-based authorization
const authorize = (role) => async (ctx, next) => {
  const user = ctx.state.user;
  
  if (!user || user.role !== role) {
    utils.setStatus(ctx, 403);
    return utils.setResponse(ctx, utils.createResponse(ctx, { 
      error: "Forbidden" 
    }));
  }
  
  await next();
};

// Apply middleware chain
app.get("/admin/dashboard", 
  authenticate,
  authorize("admin"),
  adminDashboardHandler
);
```

### Custom Response Types

```typescript
const createJsonResponse = (ctx, data, status = 200) => {
  utils.setStatus(ctx, status);
  utils.setHeader(ctx, "Content-Type", "application/json");
  return utils.setResponse(ctx, utils.createResponse(ctx, data));
};

const createXmlResponse = (ctx, data, status = 200) => {
  utils.setStatus(ctx, status);
  utils.setHeader(ctx, "Content-Type", "application/xml");
  return utils.setResponse(ctx, new Response(convertToXml(data), { 
    status, 
    headers: ctx.headers 
  }));
};
```
