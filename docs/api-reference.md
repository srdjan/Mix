# API Reference

## Core API

```typescript
interface BixApp {
  use(middleware: Middleware): this;
  get(path: string, handler: Handler): this;
  post(path: string, config: RouteConfig): this;
  workflow<S, E>(): WorkflowEngine<S, E>;
  listen(options: Deno.ServeOptions): void;
}
```

## Workflow Engine

```typescript
interface WorkflowEngine<S, E> {
  defineTransition(config: Transition<S, E>): this;
  load(json: unknown): this;
  toJSON(): WorkflowDefinition<S, E>;
  createHandler(path: string, handler: Handler): this;
}

type Transition<S, E> = {
  from: S;
  to: S;
  on: E;
  task: Task;
};
```

## Context API

```typescript
interface Context {
  request: Request;
  status: number;
  headers: Headers;
  validated: {
    body: ValidationResult;
    params: ValidationResult;
    query: ValidationResult;
    headers: ValidationResult;
  };
  respond(data: unknown, options?: RespondOptions): void;
  workflow: WorkflowState; // Only in workflow contexts
}
```
