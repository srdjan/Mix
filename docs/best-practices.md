# Best Practices 🏗️

## Project Structure

### Recommended Layout

  ```ascii

  /src
  │
  ├── /api
  │   ├── routes/         # API endpoints
  │   │   ├── users.ts
  │   │   └── products.ts
  │   │
  │   └── schemas/        # Validation schemas
  │       ├── user.ts
  │       └── product.ts
  │
  ├── /workflows
  │   ├── definitions/    # JSON workflow configs
  │   │   ├── ticket.json
  │   │   └── approval.json
  │   │
  │   └── handlers/       # Transition handlers
  │       ├── ticket.ts
  │       └── approval.ts
  │
  ├── middleware/         # Shared middleware
  │   ├── auth.ts
  │   └── logging.ts
  │
  └── app.ts              # Main application setup

  ```

### Key Principles

## **Separation of Concerns**

  ```typescript
  // Instead of:
  app.get("/users", (ctx) => { /* DB ops, validation, business logic */ });

  // Do:
  // routes/users.ts
  export const getUser = (ctx) => { /* Handler logic */ };

  // app.ts
  import { getUser } from "./api/routes/users";
  app.get("/users", getUser);
  ```

## **Schema Sharing**

   ```typescript
   // schemas/user.ts
   export const userSchema = type({
     id: "string",
     email: "email",
     role: "'user'|'admin'"
   });

   // Reuse across endpoints
   app.post("/users", { schema: { body: userSchema } });
   app.patch("/users/:id", { schema: { params: userSchema } });
   ```

---

## Error Handling Strategy

### Layered Approach

  ```typescript
  // middleware/errorHandler.ts
  export const errorHandler: Middleware = async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      // Structured error response
      ctx.status = err.status || 500;
      ctx.json({
        error: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      });
      
      // Logging
      console.error(`[${ctx.request.method}] ${ctx.url} - Error: ${err.stack}`);
    }
  };

  // Usage
  app.use(errorHandler);
  ```

### Custom Error Classes

  ```typescript
  // errors.ts
  export class ValidationError extends Error {
    constructor(public issues: ValidationIssue[]) {
      super("Invalid request data");
      this.name = "ValidationError";
    }
  }

  // In handlers
  if (!valid) {
    throw new ValidationError(validation.issues);
  }
  ```

### Workflow Error Recovery

  ```typescript
  workflow.createHandler("/transitions", (ctx) => {
    try {
      ctx.applyTransition(event);
    } catch (err) {
      ctx.workflow.rollback(); // Implement state rollback
      ctx.respond({
        error: "Transition failed",
        lastValidState: ctx.workflow.currentState
      });
    }
  });
  ```

---

## Workflow Design

### State Machine Principles

1. **Immutable Transitions**

   ```typescript
   // Load from JSON during startup
   const workflow = app.workflow();
   Deno.readTextFileSync("./workflows/ticket.json")
     .then(config => workflow.load(config));
   ```

2. **State Versioning**

   ```json
   // workflows/v1/ticket.json
   {
     "version": "1.0.1",
     "states": ["Open", "Pending"],
     "transitions": [...]
   }
   ```

3. **Transition Validation**

   ```typescript
   workflow.createHandler("/transitions", (ctx) => {
     if (!ctx.workflow.isValidTransition(event)) {
       ctx.metrics.invalidTransitions.inc(); // Track metrics
       throw new InvalidTransitionError(event);
     }
   });
   ```

---

## Performance Optimization

### Middleware Optimization

  ```typescript
  // Use efficient middleware ordering
  app.use
    .use(compression())      // Early in chain
    .use(securityHeaders())  
    .use(bodyParser())       // Only on needed routes
    .use(expensiveAuth());   // Later in chain
  ```

### Caching Strategies

  ```typescript
  // workflows/handlers/ticket.ts
  const stateCache = new LRU<string, WorkflowState>({
    max: 1000,
    ttl: 60_000 // 1 minute
  });

  export const getState = (ctx) => {
    const cached = stateCache.get(ctx.params.id);
    if (cached) return ctx.json(cached);
    
    const state = fetchStateFromDB(ctx.params.id);
    stateCache.set(ctx.params.id, state);
    return ctx.json(state);
  };
  ```

---

## Security Practices

### Input Sanitization

  ```typescript
  // middleware/sanitization.ts
  export const xssProtection: Middleware = (ctx, next) => {
    const sanitize = (obj: Record<string, unknown>) => {
      // Implement XSS sanitization logic
    };
    
    if (ctx.validated.body) sanitize(ctx.validated.body);
    if (ctx.validated.query) sanitize(ctx.validated.query);
    
    next();
  };

  // Apply to all routes
  app.use(xssProtection);
  ```

### Rate Limiting

  ```typescript
  // middleware/rateLimit.ts
  const limiter = new TokenBucket({
    capacity: 100,
    refillRate: 1 // per second
  });

  export const rateLimit: Middleware = (ctx, next) => {
    if (!limiter.consume(ctx.ip)) {
      ctx.status = 429;
      return ctx.json({ error: "Too many requests" });
    }
    next();
  };

  // Apply to sensitive endpoints
  app.post("/login", rateLimit, loginHandler);
  ```

---

## Testing Strategy

### Unit Testing Handlers

  ```typescript
  // tests/userHandlers.test.ts
  Deno.test("GET /users returns valid response", async () => {
    const mockCtx = createMockContext({
      path: "/users",
      method: "GET"
    });
    
    await userHandlers.getUsers(mockCtx);
    
    assertEquals(mockCtx.status, 200);
    assertInstanceOf(mockCtx.body, Array);
  });
  ```

### Workflow Transition Testing

  ```typescript
  Deno.test("Ticket workflow transitions", () => {
    const workflow = setupWorkflow();
    
    workflow.applyTransition("StartProgress");
    assertEquals(workflow.currentState, "InProgress");
    
    workflow.applyTransition("Complete");
    assertEquals(workflow.currentState, "Resolved");
    
    assertThrows(() => workflow.applyTransition("InvalidEvent"));
  });
  ```

### Load Testing

  ```bash
  # Run load test for workflow endpoints
  deno bench --load "/transitions" --duration 30s
  ```

---

## Documentation Practices

### Inline Type Documentation

  ```typescript
  /**
   * @typedef {Object} WorkflowTransition
   * @property {WorkflowState} from - Initial state
   * @property {WorkflowState} to - Target state
   * @property {WorkflowEvent} on - Triggering event
   * @property {TaskAssignment} task - Resulting task
   */
  export type WorkflowTransition = {
    from: WorkflowState;
    to: WorkflowState;
    on: WorkflowEvent;
    task: TaskAssignment;
  };
  ```

### Automated API Docs

  ```typescript
  // Generate OpenAPI spec from routes
  const specBuilder = new OpenAPIBuilder({
    title: "Ticket API",
    version: "1.0.0"
  });

  app.routes.forEach(route => {
    specBuilder.addPath(route.path, {
      [route.method]: {
        description: route.handler.description,
        parameters: route.schema
      }
    });
  });

  Deno.writeTextFileSync("openapi.json", specBuilder.spec);
  ```
