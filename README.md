# Mix 🚀

**Type-Safe API & Workflow Microframework for Deno**
*Build Robust REST APIs and Stateful Workflows with Confidence*

*Powered by [Deno](https://deno.land) and [ArkType](https://arktype.io)*

[![Deno Version](https://img.shields.io/badge/deno-2.2-blue?logo=deno)](https://deno.land)
[![ArkType Version](https://img.shields.io/badge/arktype-2.1-orange?logo=deno)](https://arktype.io/)
[![HTMX Version](https://img.shields.io/badge/htmx-2.0.4-green?logo=htmx)](https://htmx.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```ts
// Simple API Example
const app = App();
const { utils } = app;

app.get("/hello", (ctx) => {
  ctx.response = utils.createResponse(ctx, { message: "Hello World" });
});

app.listen(3000);
```

## Features ✨

- **Type-Safe Everything**
  From route params to workflow states - TypeScript first
- **ArkType Integration**
  Runtime validation with perfect type inference
- **Custom Pattern Matching**
  Built-in elegant, type-safe pattern matching with exhaustiveness checking
- **Content Negotiation**
  Automatic format selection based on Accept header (JSON, HAL, HTML)
- **HTMX Integration**
  Build interactive UIs with minimal JavaScript
- **HATEOAS Ready**
  Built-in hypermedia support with `createLinks` utility
- **Workflow Engine**
  State machines with audit trails
- **Consistent Error Handling**
  Standardized error responses with `handleError` utility
- **Elegant Response Creation**
  Clean API responses with `createResponse` utility
- **Lightweight Core**
  <5KB base, zero dependencies
- **Deno Native**
  ES Modules, top-level await, modern JS

## Installation 📦

```typescript
// Import directly from Deno.land
import { App, type, match } from "./lib/mix.ts";

// Access utility functions
const app = App();
const { utils } = app;
const { handleError, createResponse, createLinks } = utils;
```

Permissions (add to deno.json):

```json
{
  "permissions": {
    "net": true,
    "read": true,
    "write": true
  }
}
```

## Usage Examples 🛠️

### Workflow Example with HTMX

Try our interactive workflow example with HTMX integration:

```bash
# Run the workflow example
deno task workflow

# Run with file watching (auto-reload on changes)
deno task workflow:watch
```

Then open your browser to [http://localhost:3000](http://localhost:3000) to see the application.

This example demonstrates:

- Content negotiation between JSON, HAL, and HTML
- HTMX integration for interactive UI without JavaScript
- Nano JSX for server-side rendering
- Single-page application with dynamic content swapping
- Workflow state management with transitions

See [examples/workflow/README.md](./examples/workflow/README.md) for more details.

### Basic API

```typescript
const app = App();
const { utils } = app;
const { handleError, createResponse, createLinks } = utils;

// Simple endpoint with content negotiation
app.get("/users", (ctx): void => {
  const users = [{ id: 1, name: "Alice" }];
  // Response format determined by Accept header (JSON, HAL, or HTML)
  ctx.response = createResponse(ctx, users);
});

// Validated POST with type safety
app.post("/users", (ctx): void => {
  if (!ctx.validated.body.ok) {
    handleError(ctx, 400, "Invalid user data", ctx.validated.body.error);
    return;
  }

  const user = ctx.validated.body.value;
  const userId = crypto.randomUUID();

  ctx.status = 201;
  // Create response with HATEOAS links
  ctx.response = createResponse(ctx,
    { ...user, id: userId },
    {
      links: createLinks('users', userId),
      // Optional: force specific format regardless of Accept header
      // mediaType: MediaType.HAL
    }
  );
});

app.listen(8000);
```

### Workflow Management

```typescript
type ArticleState = "Draft" | "Published";
type ArticleEvent = "Publish";

const app = App();
const { utils } = app;
const { handleError, createResponse, createLinks } = utils;

// Create workflow engine
const workflow = app.workflow();

// Define transitions
workflow.load({
  states: ["Draft", "Published"],
  events: ["Publish"],
  transitions: [{
    from: "Draft",
    to: "Published",
    on: "Publish",
    task: { assign: "editor", message: "Review article {id}" }
  }],
  initial: "Draft"
});

// Create workflow handler
workflow.createHandler("/articles/:id/publish", (ctx): void => {
  if (!ctx.validated.params.ok) {
    handleError(ctx, 400, "Invalid article ID", ctx.validated.params.error);
    return;
  }

  const articleId = ctx.validated.params.value.id;
  const { instance } = ctx.workflow;

  // Apply transition
  const success = utils.applyTransition(instance, "Publish");

  if (!success) {
    handleError(ctx, 400, "Cannot publish article", {
      currentState: instance.currentState
    });
    return;
  }

  // Return response with HATEOAS links
  ctx.response = createResponse(ctx, {
    state: instance.currentState,
    tasks: utils.getPendingTasks(instance)
  }, { links: createLinks('articles', articleId) });
});
```

## Documentation 📚

Explore full capabilities at:
[📖 Mix Documentation](https://Mixframework.org/docs)

| Section               | Description                          |
|-----------------------|--------------------------------------|
| [Core Concepts](./docs/core-concepts.md)  | Middleware, Validation, HATEOAS      |
| [Workflow Guide](./docs/workflow-guide.md) | State machines, Transitions, History |
| [Best Practices](./docs/best-practices.md) | Project structure, Error handling    |
| [API Reference](./docs/api-reference.md)  | Full type definitions and options    |
| [Utility Functions](./docs/utility-functions.md) | Error handling, Response creation   |
| [HTMX Integration](./docs/htmx-integration.md) | Interactive UIs with minimal JS     |

## Contributing 🤝

We welcome contributions! Please follow:

1. Open an issue to discuss changes
2. Fork the repository
3. Create a feature branch (`feat/your-feature`)
4. Submit a PR with tests

```bash
# Development setup
deno task test
deno task fmt
deno task lint
```

## License ⚖️

MIT License - See [LICENSE](LICENSE) for details

---

**Crafted with ❤️ by [⊣˚∆˚⊢](https://srdjan.github.io) & DeepSeek**
