# API Reference

## Core Concepts

Mixon is a minimalist, performance-optimized TypeScript framework for building APIs and workflow engines in Deno. It embraces strategic mutation for performance-critical paths while maintaining functional principles for business logic.

### Key Design Principles

- **Strategic Mutation**: Performance-critical paths use direct mutation
- **Type Safety**: Comprehensive TypeScript types with perfect inference
- **Pattern Matching**: Declarative control flow with exhaustive validation
- **Result Types**: Explicit error handling with discriminated unions
- **Minimal Dependencies**: Zero external runtime dependencies

### Type System

```typescript
// Result type for explicit error handling
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Validation result specialization
type ValidationResult<T> = Result<T, string[]>;

// Core context type
type Context = {
  request: Request;
  status: number;
  headers: Headers;
  state: Record<string, unknown>;
  response?: Response;
  validated: {
    body: ValidationResult<unknown>;
    params: ValidationResult<Record<string, string>>;
    query: ValidationResult<Record<string, string>>;
    headers: ValidationResult<Record<string, string>>;
  };
};

// Handler and middleware types
type Next = () => Promise<void>;
type Middleware<T extends Context = Context> = (ctx: T, next: Next) => Promise<void>;
type Handler<T extends Context = Context> = (ctx: T) => Promise<void> | void;
```

## Application

### Initialization

```typescript
import { App } from "jsr:@srdjan/mixon";

const app = App();
const { utils } = app;

// Start server
app.listen({
  port: 3000,
  hostname: "0.0.0.0",
  signal: controller.signal,
  onListen: ({ hostname, port }) => {
    console.log(`Server running at http://${hostname}:${port}/`);
  }
});

// Graceful shutdown
app.close();
```

### Route Registration

```typescript
// Basic route handlers
app.get("/", (ctx) => {
  return utils.setResponse(ctx, utils.createResponse(ctx, { message: "Hello World" }));
});

// Path parameters (type-safe)
app.get<{ id: string }>("/users/:id", (ctx) => {
  // Type-safe access to ctx.validated.params.value.id
});

// Generic parametric routes
app.post<{ id: string }, UserPayload>("/users/:id", (ctx) => {
  // Type-safe access to validated body and params
});

// HTTP method variants
app.post("/resources", createResourceHandler);
app.put("/resources/:id", updateResourceHandler);
app.delete("/resources/:id", deleteResourceHandler);
```

### Middleware

```typescript
// Global middleware
app.use(async (ctx, next) => {
  const start = performance.now();
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url} - ${performance.now() - start}ms`);
});

// Authentication middleware
const authenticate = async (ctx: Context, next: Next) => {
  const token = ctx.request.headers.get("Authorization")?.split(" ")[1];

  if (!token) {
    utils.setStatus(ctx, 401);
    return utils.setResponse(ctx, utils.createResponse(ctx, { error: "Unauthorized" }));
  }

  ctx.state.user = await validateToken(token);
  await next();
};

// Apply middleware to specific routes
app.get("/protected", authenticate, protectedResourceHandler);
```

## Context Manipulation

The Context object represents the request/response cycle and is designed for efficient in-place mutation.

### Status and Headers

```typescript
// Set status code
utils.setStatus(ctx, 201);

// Set header
utils.setHeader(ctx, "Content-Type", "application/json");
utils.setHeader(ctx, "Location", `/resources/${id}`);

// Create and set response
const response = utils.createResponse(ctx, data);
utils.setResponse(ctx, response);

// Chaining is supported
utils.setStatus(ctx, 201);
utils.setHeader(ctx, "Location", `/resources/${id}`);
utils.setResponse(ctx, utils.createResponse(ctx, data));
```

### Response Creation

```typescript
// Simple response
const response = utils.createResponse(ctx, {
  success: true,
  data: items
});

// With HATEOAS links
const response = utils.createResponse(ctx, data, {
  links: {
    self: `/resources/${id}`,
    related: `/resources/${id}/related`,
    collection: `/resources`
  }
});

// With embedded resources
const response = utils.createResponse(ctx, data, {
  relations: {
    items: relatedItems
  }
});
```

### Error and Response Utilities

```typescript
// Handle errors with consistent formatting
utils.handleError(ctx, 400, "Invalid request data", validationErrors);

// Create standardized links for resources
const links = utils.createLinks('resources', resourceId);
// Result: { self: '/resources/123', collection: '/resources' }
```

## Validation

Mixon uses ArkType for runtime validation with perfect TypeScript inference.

### Schema Definition

```typescript
import { type, scope } from "jsr:@srdjan/mixon";

// Simple validation schema
const userSchema = type({
  name: "string>3",
  email: "email",
  age: ["number", ">", 18]
});

// Scope-based validation
const productSchema = scope({
  name: "string>3",
  price: "number>0",
  category: "'electronics'|'books'|'clothing'",
  inStock: "boolean"
}).compile();

// Type inference
type Product = typeof productSchema.infer;
```

### Validation Usage

```typescript
// Validate incoming data
const validation = utils.validate(userSchema, ctx.validated.body.value);

// Handle validation result
return utils.handleResult(validation, ctx,
  (user, ctx) => {
    // Success path with validated user
    utils.setStatus(ctx, 201);
    return utils.setResponse(ctx, utils.createResponse(ctx, user));
  },
  (errors, ctx) => {
    // Error path with validation errors
    utils.setStatus(ctx, 400);
    return utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Invalid data",
      details: errors
    }));
  }
);
```

## Pattern Matching

Mixon provides powerful pattern matching for type-safe conditional logic.

```typescript
import { match } from "jsr:@srdjan/mixon";

// Simple pattern matching
return match(statusCode)
  .with(200, () => "OK")
  .with(404, () => "Not Found")
  .with(500, () => "Server Error")
  .otherwise(() => "Unknown Status");

// Pattern matching with extraction
return match(user)
  .with({ role: "admin" }, (admin) => adminDashboard(admin))
  .with({ role: "user", verified: true }, (user) => userDashboard(user))
  .with({ role: "user", verified: false }, () => verificationScreen())
  .otherwise(() => loginScreen());

// Exhaustive matching with results
return match(result)
  .with({ ok: true }, ({ value }) => handleSuccess(value))
  .with({ ok: false }, ({ error }) => handleError(error))
  .exhaustive();
```

## Workflow Engine

Mixon includes a performance-optimized state machine for modeling business processes.

### Workflow Definition

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
```

### Workflow Operations

```typescript
// Check if transition is possible
const canTransition = utils.canTransition(instance, event);

// Apply transition (mutates instance)
const success = utils.applyTransition(instance, event);

// Find transition definition
const transition = utils.findTransition(instance, event);

// Get pending tasks
const tasks = utils.getPendingTasks(instance);

// Assign task
utils.assignTask(instance, task);
```

### Workflow Handler

```typescript
orderWorkflow.createHandler("/orders/:id/transitions", async (ctx) => {
  // Implementation details...
  const workflowInstance = ctx.workflow.instance;

  // Apply transition
  const success = utils.applyTransition(workflowInstance, event);

  if (success) {
    // Update related business objects
    order.status = workflowInstance.currentState;
    await saveOrder(order);

    return utils.setResponse(ctx, utils.createResponse(ctx, {
      status: order.status,
      order: order
    }));
  }
});
```

## Performance Utilities

Mixon provides tools for monitoring and optimizing performance.

### Memory Monitoring

```typescript
// Get memory usage
const memoryUsage = Deno.memoryUsage();
console.log({
  rss: formatBytes(memoryUsage.rss),
  heapTotal: formatBytes(memoryUsage.heapTotal),
  heapUsed: formatBytes(memoryUsage.heapUsed)
});

// Format bytes helper
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}
```

### Performance Measurement

```typescript
// Measure execution time
const start = performance.now();
await operation();
const duration = performance.now() - start;
console.log(`Operation completed in ${duration.toFixed(2)}ms`);

// Create performance marks and measures
performance.mark("startOperation");
await operation();
performance.mark("endOperation");
performance.measure("operation", "startOperation", "endOperation");
```

## Error Handling

Mixon uses Result types for explicit error handling.

```typescript
// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);

    utils.setStatus(ctx, 500);
    utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Internal server error",
      requestId: crypto.randomUUID()
    }));
  }
});

// Domain-specific error handling
const processOrder = (order: Order): Result<ProcessedOrder, OrderError> => {
  if (!order.items.length) {
    return { ok: false, error: { code: "EMPTY_ORDER", message: "Order has no items" } };
  }

  // Process order...
  return { ok: true, value: processedOrder };
};

// Using domain results
app.post("/orders", async (ctx) => {
  const orderResult = utils.validate(orderSchema, ctx.validated.body.value);

  return utils.handleResult(orderResult, ctx,
    async (order, ctx) => {
      const processResult = await processOrder(order);

      return utils.handleResult(processResult, ctx,
        (processed, ctx) => {
          utils.setStatus(ctx, 201);
          return utils.setResponse(ctx, utils.createResponse(ctx, processed));
        },
        (error, ctx) => {
          utils.setStatus(ctx, 400);
          return utils.setResponse(ctx, utils.createResponse(ctx, { error }));
        }
      );
    },
    (errors, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid order data",
        details: errors
      }));
    }
  );
});
```

## Streaming and Binary Data

Mixon supports efficient handling of streams and binary data.

```typescript
// Streaming response
app.get("/stream", (ctx) => {
  const stream = new ReadableStream({
    start(controller) {
      let count = 0;
      const interval = setInterval(() => {
        if (count >= 10) {
          clearInterval(interval);
          controller.close();
          return;
        }

        controller.enqueue(`data: ${JSON.stringify({ count })}\n\n`);
        count++;
      }, 1000);
    }
  });

  utils.setHeader(ctx, "Content-Type", "text/event-stream");
  utils.setHeader(ctx, "Cache-Control", "no-cache");
  utils.setHeader(ctx, "Connection", "keep-alive");

  return utils.setResponse(ctx, new Response(stream));
});

// Binary data response
app.get("/binary", (ctx) => {
  const buffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  utils.setHeader(ctx, "Content-Type", "application/octet-stream");
  return utils.setResponse(ctx, new Response(buffer));
});
```

## Advanced Patterns

### Resource-Based Routing

```typescript
// resource.ts
export const registerUserRoutes = (app) => {
  app.get("/users", listUsers);
  app.post("/users", createUser);
  app.get<{ id: string }>("/users/:id", getUser);
  app.put<{ id: string }>("/users/:id", updateUser);
  app.delete<{ id: string }>("/users/:id", deleteUser);
};

// routes.ts
import { registerUserRoutes } from "./resource.ts";
import { registerProductRoutes } from "./products.ts";

export const registerRoutes = (app) => {
  registerUserRoutes(app);
  registerProductRoutes(app);
};

// server.ts
import { App } from "jsr:@srdjan/mixon";
import { registerRoutes } from "./routes.ts";

const app = App();
registerRoutes(app);
app.listen({ port: 3000 });
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

// Workflow with effects
orderWorkflow.createHandler("/orders/:id/confirm", async (ctx) => {
  // Apply transition
  const success = utils.applyTransition(ctx.workflow.instance, "Confirm");

  if (success) {
    // Create pure effect description
    const effect = createEmailEffect(
      order.customer,
      `Your order #${order.id} has been confirmed`
    );

    // Execute effect at boundary
    executeEffect(effect);

    return utils.setResponse(ctx, utils.createResponse(ctx, {
      status: "confirmed"
    }));
  }
});
```

## Utilities Reference

```typescript
// Context utilities
utils.setStatus(ctx, statusCode); // Set response status code
utils.setHeader(ctx, key, value); // Set response header
utils.setResponse(ctx, response); // Set response object
utils.createResponse(ctx, data, options); // Create response from data
utils.handleError(ctx, status, message, details); // Handle errors with consistent formatting
utils.createLinks(resourcePath, id); // Create standardized HATEOAS links

// Validation utilities
utils.validate(schema, input); // Validate input against schema
utils.handleResult(result, ctx, successHandler, errorHandler); // Handle Result type

// Pattern matching
utils.match(value); // Create pattern matcher

// Workflow utilities
utils.canTransition(instance, event); // Check if transition is possible
utils.applyTransition(instance, event); // Apply transition
utils.findTransition(instance, event); // Find transition definition
utils.getPendingTasks(instance); // Get pending tasks
utils.assignTask(instance, task); // Assign task
```
