# Core Concepts

## Middleware System

  ```typescript
  // Logging middleware
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(`${ctx.request.method} ${ctx.url.pathname} - ${Date.now() - start}ms`);
  });

  // Authentication middleware
  app.use(async (ctx, next) => {
    const token = ctx.request.headers.get("Authorization");
    ctx.state.user = await validateToken(token);
    await next();
  });
  ```

## Type-Safe Validation

  ```typescript
  const userSchema = type({
    email: "email",
    age: "integer>18",
    preferences: {
      newsletter: "boolean",
      theme: "'dark'|'light'"
    }
  });

  app.post("/users", {
    schema: { body: userSchema },
    handler: (ctx) => {
      // ctx.validated.body.data is inferred as:
      // { email: string; age: number; preferences: {...} }
      createUser(ctx.validated.body.data);
    }
  });
  ```

## HATEOAS Support

  ```typescript
  app.get("/orders/:id", (ctx) => {
    ctx.respond(order, {
      links: {
        self: `/orders/${order.id}`,
        payment: { href: `/payments?order=${order.id}`, method: "POST" }
      },
      relations: {
        items: order.items.map(item => ({
          _links: { product: `/products/${item.sku}` }
        }))
      }
    });
  });
  ```
