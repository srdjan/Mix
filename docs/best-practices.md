# Mixon Best Practices

## Core Principles

Mixon's architecture balances performance optimization with functional programming principles. These best practices will help you create efficient, maintainable, and type-safe Mixon applications.

### Strategic Immutability

Embrace controlled mutation for performance-critical paths while preserving immutability for domain logic:

```typescript
// Performance-critical path: Use mutation
utils.setStatus(ctx, 201);
utils.setHeader(ctx, "Location", `/resources/${id}`);

// Domain logic: Preserve immutability
const calculateTotals = (items: OrderItem[]): OrderTotals => ({
  subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  tax: items.reduce((sum, item) => sum + item.taxAmount, 0),
  total: items.reduce((sum, item) => sum + (item.price * item.quantity) + item.taxAmount, 0)
});
```

### Type-Driven Development

Build your API from types outward, not the other way around:

```typescript
// 1. Define your domain types
type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  verified: boolean;
};

// 2. Define validation schemas that mirror your types
const userSchema = scope({
  email: "email",
  name: "string>2",
  role: "'admin'|'user'",
  verified: "boolean"
}).compile();

// 3. Implement handlers using those types
app.post<{}, typeof userSchema.infer>("/users", async (ctx) => {
  return utils.handleResult(ctx.validated.body, ctx,
    (userData, ctx) => createUser(userData, ctx),
    (errors, ctx) => handleValidationError(errors, ctx)
  );
});
```

### Explicit Error Handling

Always handle errors explicitly using Result types:

```typescript
// Domain operations return Results
const findUser = async (id: string): Promise<Result<User, UserError>> => {
  try {
    const user = await db.users.findOne({ id });
    return user
      ? { ok: true, value: user }
      : { ok: false, error: { code: "USER_NOT_FOUND", message: `User ${id} not found` } };
  } catch (err) {
    return {
      ok: false,
      error: { code: "DB_ERROR", message: err.message }
    };
  }
};

// Handle Results explicitly in your API
app.get<{ id: string }>("/users/:id", async (ctx) => {
  return utils.handleResult(ctx.validated.params, ctx,
    async (params, ctx) => {
      const result = await findUser(params.id);

      return utils.handleResult(result, ctx,
        (user, ctx) => utils.setResponse(ctx, utils.createResponse(ctx, user)),
        (error, ctx) => {
          if (error.code === "USER_NOT_FOUND") {
            utils.setStatus(ctx, 404);
          } else {
            utils.setStatus(ctx, 500);
          }
          return utils.setResponse(ctx, utils.createResponse(ctx, { error }));
        }
      );
    },
    (errors, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid user ID",
        details: errors
      }));
    }
  );
});
```

## Application Structure

### Module Organization

Structure your application with clear boundaries:

```text
src/
├── domain/           # Business domain types and logic
│   ├── user.ts       # User domain
│   ├── order.ts      # Order domain
│   └── product.ts    # Product domain
├── api/              # API endpoints
│   ├── users.ts      # User endpoints
│   ├── orders.ts     # Order endpoints
│   └── products.ts   # Product endpoints
├── middleware/       # Custom middleware
│   ├── auth.ts       # Authentication middleware
│   ├── logging.ts    # Logging middleware
│   └── metrics.ts    # Metrics middleware
├── services/         # External service integrations
│   ├── email.ts      # Email service
│   ├── payment.ts    # Payment service
│   └── storage.ts    # Storage service
├── db/               # Database operations
│   ├── client.ts     # Database client
│   ├── users.ts      # User repository
│   └── orders.ts     # Order repository
├── utils/            # Shared utilities
│   ├── validation.ts # Validation helpers
│   ├── errors.ts     # Error handling utilities
│   └── dates.ts      # Date manipulation utilities
├── workflows/        # Business workflows
│   ├── order.ts      # Order processing workflow
│   └── signup.ts     # User signup workflow
└── app.ts            # Application bootstrap
```

### Domain-Driven Routes

Organize routes by domain resource:

```typescript
// users.ts
export const registerUserRoutes = (app) => {
  // List users with pagination and filtering
  app.get("/users", listUsers);

  // Get user by ID
  app.get<{ id: string }>("/users/:id", getUser);

  // Create new user
  app.post("/users", createUser);

  // Update user
  app.put<{ id: string }>("/users/:id", updateUser);

  // Delete user
  app.delete<{ id: string }>("/users/:id", deleteUser);

  // User-specific sub-resources
  app.get<{ id: string }>("/users/:id/preferences", getUserPreferences);
  app.put<{ id: string }>("/users/:id/preferences", updateUserPreferences);
};

// app.ts
import { registerUserRoutes } from "./api/users.ts";
import { registerOrderRoutes } from "./api/orders.ts";
import { registerProductRoutes } from "./api/products.ts";

const app = App();

// Register routes by domain
registerUserRoutes(app);
registerOrderRoutes(app);
registerProductRoutes(app);

app.listen({ port: 3000 });
```

### Middleware Composition

Apply middleware strategically:

```typescript
// Global middleware (applied to all routes)
app.use(requestLogger);
app.use(errorHandler);

// Domain-specific middleware
const userMiddleware = [
  authenticate,
  auditLog("users")
];

// Route-specific middleware composition
app.get("/users", ...userMiddleware, listUsers);
app.post("/users", ...userMiddleware, validateUserData, createUser);

// Conditional middleware
const conditionalAuth = (ctx, next) => {
  const path = new URL(ctx.request.url).pathname;
  if (path.startsWith("/admin")) {
    return authenticate(ctx, next);
  }
  return next();
};
```

## Type Safety

### Exhaustive Pattern Matching

Use pattern matching for exhaustive type checking:

```typescript
import { match } from "./mod.ts";

type UserState =
  | { status: "guest" }
  | { status: "registered", id: string }
  | { status: "verified", id: string, email: string }
  | { status: "admin", id: string, permissions: string[] };

// Exhaustive handling of all states
const getUserPrivileges = (user: UserState): string[] =>
  match(user)
    .with({ status: "guest" }, () => [])
    .with({ status: "registered" }, () => ["read"])
    .with({ status: "verified" }, () => ["read", "write"])
    .with({ status: "admin" }, ({ permissions }) => ["read", "write", ...permissions])
    .exhaustive();

// Type refinement with conditions
const canModifyResource = (user: UserState, resourceOwnerId: string): boolean =>
  match(user)
    .with({ status: "admin" }, () => true)
    .with({ status: "verified", id: resourceOwnerId }, () => true)
    .otherwise(() => false);
```

### Safe Type Narrowing

Prefer tagged unions and pattern matching over type assertions:

```typescript
// Avoid type assertions
const processInput = (input: unknown) => {
  // Bad: Type assertion
  const data = input as { id: string; value: number };

  // Good: Runtime validation
  const validation = utils.validate(
    type({ id: "string", value: "number" }),
    input
  );

  return utils.handleResult(validation,
    data => processValidData(data),
    error => handleValidationError(error)
  );
};
```

## Performance Optimization

### Strategic Data Copying

Minimize object copying for performance-critical operations:

```typescript
// Instead of creating new objects for every transformation:
const processRequest = (ctx: Context) => {
  // Directly mutate context in performance-critical paths
  utils.setStatus(ctx, 200);
  utils.setHeader(ctx, "Content-Type", "application/json");

  // Use mutation for large data structures that don't need history
  const results = ctx.state.searchResults;

  // Sort in-place for large arrays
  results.sort((a, b) => a.relevance - b.relevance);

  return utils.setResponse(ctx, utils.createResponse(ctx, { results }));
};
```

### Lazy Evaluation

Compute values only when needed:

```typescript
// Instead of computing everything upfront
app.get("/dashboard", (ctx) => {
  // Store computation functions in state
  ctx.state.getRecentOrders = () => db.orders.findRecent();
  ctx.state.getPopularProducts = () => db.products.findPopular();
  ctx.state.getUserMetrics = () => analytics.getUserMetrics();

  // Let the handler decide what to compute
  return dashboardHandler(ctx);
});

// Handler only computes what it needs
const dashboardHandler = async (ctx: Context) => {
  const view = new URL(ctx.request.url).searchParams.get("view") || "orders";

  // Only compute what's needed for the requested view
  if (view === "orders") {
    const orders = await ctx.state.getRecentOrders();
    return utils.setResponse(ctx, utils.createResponse(ctx, { orders }));
  }

  if (view === "products") {
    const products = await ctx.state.getPopularProducts();
    return utils.setResponse(ctx, utils.createResponse(ctx, { products }));
  }

  // Default dashboard with minimal data
  return utils.setResponse(ctx, utils.createResponse(ctx, {
    message: "Select a view"
  }));
};
```

### Connection and Resource Pooling

Manage expensive resources with pools:

```typescript
// Create a database connection pool
const dbPool = createPool({
  min: 5,
  max: 20,
  create: () => createConnection(DB_URL),
  destroy: (conn) => conn.close(),
});

// Database middleware to provide connections
app.use(async (ctx, next) => {
  const connection = await dbPool.acquire();

  try {
    ctx.state.db = connection;
    await next();
  } finally {
    await dbPool.release(connection);
  }
});
```

## Workflow Engine Patterns

### Clean State Management

Keep workflow state transitions clean and explicit:

```typescript
// Define workflow with clear states and transitions
const orderWorkflow = app.workflow<OrderState, OrderEvent>();

orderWorkflow.load({
  states: ["Draft", "Submitted", "Processing", "Shipped", "Delivered", "Cancelled"],
  events: ["Submit", "Process", "Ship", "Deliver", "Cancel"],
  transitions: [
    // From Draft, can only Submit or Cancel
    { from: "Draft", to: "Submitted", on: "Submit" },
    { from: "Draft", to: "Cancelled", on: "Cancel" },

    // From Submitted, can Process or Cancel
    { from: "Submitted", to: "Processing", on: "Process" },
    { from: "Submitted", to: "Cancelled", on: "Cancel" },

    // From Processing, can Ship or Cancel
    { from: "Processing", to: "Shipped", on: "Ship" },
    { from: "Processing", to: "Cancelled", on: "Cancel" },

    // From Shipped, can only Deliver
    { from: "Shipped", to: "Delivered", on: "Deliver" },
  ],
  initial: "Draft"
});

// Use pattern matching for state-dependent behavior
const getOrderActions = (order: Order): string[] =>
  match(order.state)
    .with("Draft", () => ["Submit", "Cancel"])
    .with("Submitted", () => ["Process", "Cancel"])
    .with("Processing", () => ["Ship", "Cancel"])
    .with("Shipped", () => ["Deliver"])
    .with("Delivered", () => [])
    .with("Cancelled", () => [])
    .exhaustive();
```

### Event-Driven Processing

Use workflow events to drive business processes:

```typescript
orderWorkflow.createHandler("/orders/:id/events", async (ctx) => {
  return utils.handleResult(ctx.validated.params, ctx,
    async (params, ctx) => {
      // Get order
      const order = await db.orders.findOne(params.id);
      if (!order) {
        utils.setStatus(ctx, 404);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Order not found"
        }));
      }

      // Validate body
      return utils.handleResult(
        utils.validate(
          type({ event: ["Submit", "|", "Process", "|", "Ship", "|", "Deliver", "|", "Cancel"] }),
          ctx.validated.body.value
        ),
        ctx,
        async (body, ctx) => {
          const { event } = body;
          const instance = ctx.workflow.instance;

          // Check if transition is valid
          if (!utils.canTransition(instance, event)) {
            utils.setStatus(ctx, 400);
            return utils.setResponse(ctx, utils.createResponse(ctx, {
              error: "Invalid state transition",
              currentState: instance.currentState,
              event: event
            }));
          }

          // Apply transition
          const success = utils.applyTransition(instance, event);

          if (success) {
            // Update order with new state
            order.state = instance.currentState;
            await db.orders.update(order.id, order);

            // Find transition for task info
            const transition = utils.findTransition(instance, event);

            // Process side effects
            if (transition?.task) {
              await processOrderTask(order, transition.task);
            }

            return utils.setResponse(ctx, utils.createResponse(ctx, {
              order,
              state: order.state,
              availableEvents: getOrderActions(order)
            }));
          }

          // Transition failed
          utils.setStatus(ctx, 500);
          return utils.setResponse(ctx, utils.createResponse(ctx, {
            error: "Failed to apply transition"
          }));
        },
        (errors, ctx) => {
          utils.setStatus(ctx, 400);
          return utils.setResponse(ctx, utils.createResponse(ctx, {
            error: "Invalid event data",
            details: errors
          }));
        }
      );
    },
    (errors, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid order ID",
        details: errors
      }));
    }
  );
});
```

## Error Handling

### Using Utility Functions

Mixon provides utility functions for consistent error handling and response creation:

```typescript
// Import from lib/mix.ts
import { App } from "./lib/mix.ts";
const app = App();
const { utils } = app;
const { handleError, createResponse, createLinks } = utils;

// Use in handlers
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

### Domain-Specific Errors

Define domain-specific error types:

```typescript
// Domain error types
type OrderErrorCode =
  | "INVALID_ORDER"
  | "PRODUCT_UNAVAILABLE"
  | "PAYMENT_FAILED"
  | "SHIPPING_UNAVAILABLE";

type OrderError = {
  code: OrderErrorCode;
  message: string;
  details?: unknown;
};

// Error creation helpers
const createOrderError = (
  code: OrderErrorCode,
  message: string,
  details?: unknown
): OrderError => ({
  code,
  message,
  details
});

// Domain operations return Result types
const processOrder = async (order: Order): Promise<Result<Order, OrderError>> => {
  // Check inventory
  const unavailableProduct = await findUnavailableProduct(order);
  if (unavailableProduct) {
    return {
      ok: false,
      error: createOrderError(
        "PRODUCT_UNAVAILABLE",
        `Product ${unavailableProduct.name} is out of stock`,
        { productId: unavailableProduct.id }
      )
    };
  }

  // Process payment
  const paymentResult = await processPayment(order);
  if (!paymentResult.ok) {
    return {
      ok: false,
      error: createOrderError(
        "PAYMENT_FAILED",
        "Payment processing failed",
        paymentResult.error
      )
    };
  }

  // Update order
  const updatedOrder = {
    ...order,
    status: "PAID",
    paymentId: paymentResult.value.id
  };

  return { ok: true, value: updatedOrder };
};
```

### Status Code Mapping

Map domain errors to appropriate HTTP status codes and use the `handleError` utility:

```typescript
// Error to status code mapping
const getStatusForError = (error: OrderError): number => {
  switch (error.code) {
    case "INVALID_ORDER":
      return 400; // Bad Request
    case "PRODUCT_UNAVAILABLE":
      return 409; // Conflict
    case "PAYMENT_FAILED":
      return 402; // Payment Required
    case "SHIPPING_UNAVAILABLE":
      return 422; // Unprocessable Entity
    default:
      return 500; // Internal Server Error
  }
};

// Use in API handlers with utility functions
app.post("/orders", (ctx): void => {
  if (!ctx.validated.body.ok) {
    handleError(ctx, 400, "Invalid order data", ctx.validated.body.error);
    return;
  }

  const orderData = ctx.validated.body.value;
  const result = processOrder(orderData);

  if (!result.ok) {
    const status = getStatusForError(result.error);
    handleError(ctx, status, result.error.message, result.error.details);
    return;
  }

  const order = result.value;
  ctx.status = 201;
  ctx.headers.set("Location", `/orders/${order.id}`);
  ctx.response = createResponse(ctx, order, {
    links: createLinks('orders', order.id)
  });
});
```

## Testing

### Handler Testing

Write unit tests for handlers:

```typescript
// users.test.ts
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { createMockContext } from "../testing/mocks.ts";
import { getUser } from "./users.ts";

Deno.test("getUser - returns user when found", async () => {
  // Arrange
  const mockUser = { id: "123", name: "Test User" };
  const mockDb = {
    users: {
      findOne: () => Promise.resolve(mockUser)
    }
  };

  const ctx = createMockContext({
    params: { id: "123" },
    state: { db: mockDb }
  });

  // Act
  await getUser(ctx);

  // Assert
  assertEquals(ctx.status, 200);
  const body = await ctx.response?.json();
  assertEquals(body, mockUser);
});

Deno.test("getUser - returns 404 when user not found", async () => {
  // Arrange
  const mockDb = {
    users: {
      findOne: () => Promise.resolve(null)
    }
  };

  const ctx = createMockContext({
    params: { id: "not-found" },
    state: { db: mockDb }
  });

  // Act
  await getUser(ctx);

  // Assert
  assertEquals(ctx.status, 404);
  const body = await ctx.response?.json();
  assertEquals(body.error, "User not found");
});
```

### Integration Testing

Test your API endpoints:

```typescript
// api.test.ts
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { app } from "../app.ts";

// Start the app in test mode
const server = app.listen({ port: 0 }); // Random port
const port = server.address?.port;

Deno.test("GET /users/:id - returns user when found", async () => {
  // Seed test data
  await seedTestUser({ id: "test-user", name: "Test User" });

  // Make request
  const res = await fetch(`http://localhost:${port}/users/test-user`);

  // Assert
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.id, "test-user");
  assertEquals(data.name, "Test User");
});

Deno.test("GET /users/:id - returns 404 when user not found", async () => {
  const res = await fetch(`http://localhost:${port}/users/not-found`);

  assertEquals(res.status, 404);
  const data = await res.json();
  assertEquals(data.error, "User not found");
});

// Clean up
Deno.addSignalListener("SIGINT", () => {
  server.close();
});
```

## Deployment

### Environment Configuration

Use environment variables for configuration:

```typescript
// config.ts
export const config = {
  port: parseInt(Deno.env.get("PORT") || "3000"),
  environment: Deno.env.get("ENVIRONMENT") || "development",
  databaseUrl: Deno.env.get("DATABASE_URL") || "postgres://localhost:5432/app",
  logLevel: Deno.env.get("LOG_LEVEL") || "info",
  maxMemoryMb: parseInt(Deno.env.get("MAX_MEMORY_MB") || "512"),
};

// app.ts
import { config } from "./config.ts";

// Configure Deno's memory limits
if (config.maxMemoryMb > 0) {
  // deno run with appropriate v8 flags
  console.log(`Setting memory limit to ${config.maxMemoryMb}MB`);
}

// Configure app based on environment
const app = App();

if (config.environment === "production") {
  app.use(productionMiddleware);
}

app.listen({ port: config.port });
```

### Graceful Shutdown

Implement proper cleanup on shutdown:

```typescript
// app.ts
import { App } from "./mod.ts";

const app = App();

// Setup routes
setupRoutes(app);

// Start server
const controller = new AbortController();
const server = app.listen({
  port: 3000,
  signal: controller.signal
});

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down gracefully...");

  // Close server
  controller.abort();

  // Close database connections
  await closeDatabase();

  // Other cleanup
  console.log("Cleanup complete");
  Deno.exit(0);
};

// Listen for termination signals
Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);
```

## Security

### Input Validation

Always validate input data:

```typescript
// Never trust external input
app.post("/login", async (ctx) => {
  return utils.handleResult(
    utils.validate(
      type({
        username: "email",
        password: ["string", "length>", 8]
      }),
      ctx.validated.body.value
    ),
    ctx,
    async (credentials, ctx) => {
      // Input is now validated
      const user = await authenticateUser(credentials);
      return utils.handleResult(user, ctx,
        (user, ctx) => handleSuccessfulLogin(user, ctx),
        (error, ctx) => handleFailedLogin(error, ctx)
      );
    },
    (errors, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid credentials format",
        details: errors
      }));
    }
  );
});
```

### Content Security

Set appropriate security headers:

```typescript
// Security middleware
app.use(async (ctx, next) => {
  // Security headers
  utils.setHeader(ctx, "X-Content-Type-Options", "nosniff");
  utils.setHeader(ctx, "X-Frame-Options", "DENY");
  utils.setHeader(ctx, "X-XSS-Protection", "1; mode=block");
  utils.setHeader(ctx, "Referrer-Policy", "no-referrer-when-downgrade");
  utils.setHeader(ctx, "Content-Security-Policy", "default-src 'self'");

  await next();
});
```

## Utility Functions

### Consistent Response Formatting

Use the utility functions for consistent response formatting:

```typescript
// Create standardized HATEOAS links
const links = createLinks('products', productId);
// Result: { self: '/products/123', collection: '/products' }

// Extend with custom links
const customLinks = {
  ...createLinks('products', productId),
  reviews: `/products/${productId}/reviews`,
  related: `/products/${productId}/related`
};

// Create response with links
ctx.response = createResponse(ctx, product, { links: customLinks });

// Create response with metadata
ctx.response = createResponse(ctx, results, {
  meta: {
    total: 100,
    page: 1,
    limit: 10
  }
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

## Conclusion

Mixon balances performance optimization with functional programming principles. By following these best practices, you can create efficient, maintainable, and type-safe applications that leverage the full potential of the framework.

Remember:

- Use strategic mutation for performance-critical paths
- Keep domain logic pure and functional
- Employ pattern matching for exhaustive type checking
- Handle errors explicitly with Result types and the `handleError` utility
- Use `createResponse` and `createLinks` for consistent API responses
- Test thoroughly at all levels
- Implement proper resource management
- Use native Deno.serve options for server configuration
- Properly handle graceful shutdown with app.close()

This approach gives you the best of both worlds: the performance of mutation-based code where it matters, and the safety and maintainability of functional patterns everywhere else.
