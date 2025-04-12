# Mixon 🚀

**Type-Safe API & Workflow Microframework for Deno**

*Build Robust REST APIs and Stateful Workflows with Confidence*

*Powered by [Deno](https://deno.land), [HTMX](https://htmx.org) and [ArkType](https://arktype.io)*

## Features ✨

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

## Installation

```typescript
// Import from JSR
import { App, type, match } from "jsr:@srdjan/mixon";

// Create an app instance
const app = App();

// Define a route
app.get("/hello", (ctx) => {
  ctx.response = new Response("Hello World");
});

// Start the server
app.listen(3000);
```

## Documentation

For full documentation, visit the [GitHub repository](https://github.com/srdjan/Mixon).

## License

MIT License
