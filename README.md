# Mix 🚀

**Type-Safe API & Workflow Microframework for Deno**  
*Build Robust REST APIs and Stateful Workflows with Confidence*

*Powered by [Deno](https://deno.land) and [ArkType](https://arktype.io)*

[![Deno Version](https://img.shields.io/badge/deno-2.2-blue?logo=deno)](https://deno.land)
[![ArkType Version](https://img.shields.io/badge/arktype-2.1-orange?logo=deno)](https://arktype.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```ts
// Simple API Example
const app = Mix()
  .get("/hello", (ctx) => ctx.json({ message: "Hello World" }))
  .listen({ port: 3000 });
```

## Features ✨

- **Type-Safe Everything**  
  From route params to workflow states - TypeScript first
- **ArkType Integration**  
  Runtime validation with perfect type inference
- **HATEOAS Ready**  
  Built-in hypermedia support
- **Workflow Engine**  
  State machines with audit trails
- **JSON Schema Persistence**  
  Save/load workflow definitions
- **Lightweight Core**  
  <5KB base, zero dependencies
- **Deno Native**  
  ES Modules, top-level await, modern JS

## Installation 📦

```bash
# Import directly from Deno.land
import { Mix } from "https://deno.land/x/Mix/mod.ts";
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

### Basic API

```typescript
const api = Mix();

// Simple endpoint
api.get("/users", (ctx) => {
  ctx.json([{ id: 1, name: "Alice" }]);
});

// Validated POST
api.post("/users", {
  schema: {
    body: type({
      name: "string",
      age: "integer>18"
    })
  },
  handler: (ctx) => {
    const user = ctx.validated.body.data;
    ctx.json({ ...user, id: crypto.randomUUID() }, { status: 201 });
  }
});

api.listen({ port: 8000 });
```

### Workflow Management

```typescript
const workflow = Mix().workflow<"Draft" | "Published", "Publish">();

// Define transitions
workflow
  .load({
    states: ["Draft", "Published"],
    events: ["Publish"],
    transitions: [{
      from: "Draft",
      to: "Published",
      on: "Publish",
      task: { assign: "editor", message: "Review article" }
    }]
  })
  .createHandler("/articles/:id/publish", (ctx) => {
    ctx.applyTransition("Publish");
    ctx.json({
      state: ctx.workflow.currentState,
      tasks: ctx.workflow.getPendingTasks()
    });
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
