# Mixon Framework Tutorial: Building APIs & Workflows

This tutorial covers using Mixon for two key scenarios:  
**1. REST API Development**  
**2. Workflow Management Systems**

## Part 1: Building REST APIs

### 1. Setup

```typescript
// api.ts
import { App } from "./mod.ts";

const api = App();

// Basic middleware
api.use(async (ctx, next) => {
  console.log(`Request: ${ctx.request.method} ${ctx.url.pathname}`);
  await next();
  console.log(`Response: ${ctx.status}`);
});

// Start server
api.listen({ port: 3000 });
```

### 2. Basic Endpoint

```typescript
// GET /hello
api.get("/hello", (ctx) => {
  ctx.respond({ message: "Hello World" }, {
    links: {
      docs: "/swagger"
    }
  });
});
```

### 3. CRUD Operations

```typescript
// Todo Model
type Todo = { id: string; task: string; completed: boolean };

// GET /todos
api.get("/todos", (ctx) => {
  const todos = database.getAll();
  ctx.respond(todos, {
    links: {
      create: { href: "/todos", method: "POST" }
    }
  });
});

// POST /todos
api.post("/todos", {
  schema: {
    body: type({
      task: "string",
      completed: "boolean"
    })
  },
  handler: (ctx) => {
    const newTodo = database.create(ctx.validated.body.data!);
    ctx.respond(newTodo, {
      status: 201,
      links: {
        self: `/todos/${newTodo.id}`
      }
    });
  }
});
```

### 4. Advanced Features

**HATEOAS Support**

```typescript
ctx.respond(data, {
  links: {
    next: "/page/2",
    search: { href: "/search{?query}", templated: true }
  },
  relations: {
    author: { id: 123, name: "Alice" }
  }
});
```

**Validation**

```typescript
const userSchema = type({
  email: "email",
  age: "integer>18",
  preferences: {
    newsletter: "boolean",
    theme: "'dark'|'light'"
  }
});

api.post("/users", {
  schema: { body: userSchema },
  handler: (ctx) => {
    // ctx.validated.body.data is type-safe
  }
});
```

## Part 2: Workflow Management

### 1. Workflow Setup

```typescript
// workflow.ts
import { App } from "./mod.ts";

const workflowApp = App();
const ticketWorkflow = workflowApp.workflow();

// Define states
type TicketState = "Open" | "InProgress" | "Resolved";
type TicketEvent = "StartProgress" | "Complete" | "Reopen";

// Load from JSON
ticketWorkflow.load({
  states: ["Open", "InProgress", "Resolved"],
  events: ["StartProgress", "Complete", "Reopen"],
  transitions: [{
    from: "Open",
    to: "InProgress",
    on: "StartProgress",
    task: { assign: "dev@company.com", message: "New ticket: {title}" }
  }],
  initial: "Open"
});
```

### 2. State Transitions

```typescript
ticketWorkflow.defineTransition({
  from: "InProgress",
  to: "Resolved",
  on: "Complete",
  task: { assign: "qa@company.com", message: "Verify fix: {title}" }
});
```

### 3. Workflow Handler

```typescript
ticketWorkflow.createHandler("/tickets/:id/transitions", (ctx) => {
  const event = ctx.validated.body.data?.event as TicketEvent;
  
  if (!ctx.workflow.canTransition(event)) {
    ctx.respond({ error: "Invalid transition" }, { status: 400 });
    return;
  }

  ctx.applyTransition(event);
  
  ctx.respond({
    currentState: ctx.workflow.currentState,
    nextAvailable: ctx.workflow.definition.transitions
      .filter(t => t.from === ctx.workflow.currentState)
  }, {
    links: {
      history: `/tickets/${ctx.params.id}/history`
    }
  });
});
```

### 4. Audit Trail

```typescript
// GET /tickets/:id/history
api.get("/tickets/:id/history", (ctx) => {
  const ticket = getTicket(ctx.params.id);
  ctx.respond(ticket.workflow.history);
});
```

## Key Features Comparison

| Feature               | API Use Case                | Workflow Use Case           |
|-----------------------|----------------------------|----------------------------|
| **Validation**        | Request body/params         | State transition rules     |
| **Persistence**       | Database records           | Workflow definitions       |
| **State Management**  | Resource CRUD state         | Business process states    |
| **Links**             | HATEOAS navigation          | Transition discovery       |
| **Typing**            | Data structures             | State machines             |

## Advanced Patterns

### 1. Hybrid API/Workflow

```typescript
// Support ticket lifecycle
api.post("/tickets", (ctx) => {
  const ticket = createTicket(ctx.body);
  workflow.applyTransition("Create"); // Custom event
  ctx.respond(ticket);
});
```

### 2. Versioned Workflows

```typescript
const v1Workflow = workflowApp.workflow();
const v2Workflow = workflowApp.workflow();

// Load different versions
v1Workflow.load(Deno.readTextFileSync("workflow-v1.json"));
v2Workflow.load(Deno.readTextFileSync("workflow-v2.json"));
```

### 3. Workflow Visualization

```typescript
// GET /workflow/definition
api.get("/workflow/definition", (ctx) => {
  ctx.respond(ticketWorkflow.toJSON());
});
```

## Running the System

```bash
# Start API server
deno run --allow-net --allow-read api.ts

# Test workflow endpoints
curl -X POST http://localhost:3000/tickets/123/transitions \
  -H "Content-Type: application/json" \
  -d '{"event": "StartProgress"}'
```

## Conclusion

**Use Mixon for APIs when:**

- Building RESTful services
- Need HATEOAS compliance
- Managing resource state

**Use Mixon Workflows when:**

- Modeling business processes
- Managing state transitions
- Requiring audit trails
- Handling task assignments

**Next Steps:**

1. Add authentication middleware
2. Implement database persistence
3. Add WebSocket notifications
4. Build admin UI using workflow definitions

This architecture enables building complex systems while maintaining type safety and clear separation between API surface and business process management.
