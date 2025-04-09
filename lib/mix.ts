// mod.ts
import { type, scope } from "arktype";

export type { Infer } from "arktype";

// ======== RESULT TYPE FOR ERROR HANDLING ========
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ======== CORE TYPES ========
type Next = () => Promise<void>;
type Middleware<T extends Context = Context> = (ctx: T, next: Next) => Promise<void>;
type Handler<T extends Context = Context> = (ctx: T) => Promise<void> | void;

// Validation helper with proper result type
const validate = <T>(schema: ReturnType<typeof type>) =>
  (input: unknown): Result<T, string[]> => {
    const result = schema(input);
    return result.problems
      ? { ok: false, error: result.problems }
      : { ok: true, value: result.data as T };
  };

// Validation result type with proper error handling
type ValidationResult<T> = Result<T, string[]>;

// Resource links for HATEOAS
type ResourceLinks = Record<string,
  | string
  | { href: string; templated?: boolean }
>;

// Enhanced context with response property
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

// ======== ROUTE TYPES ========
const routeSchema = scope({
  body: "unknown",
  params: "unknown",
  query: "unknown",
  headers: "unknown"
}).compile();

type RouteSchema = typeof routeSchema.infer;

// ======== WORKFLOW TYPES ========
const workflowStateSchema = type(["string", "|", "number", "|", "symbol"]);
const workflowEventSchema = type("string");

const transitionSchema = type({
  from: workflowStateSchema,
  to: workflowStateSchema,
  on: workflowEventSchema,
  task: {
    assign: "string",
    message: "string"
  }
});

const workflowDefinitionSchema = type({
  states: workflowStateSchema.array(),
  events: workflowEventSchema.array(),
  transitions: transitionSchema.array(),
  initial: workflowStateSchema.optional()
});

type WorkflowDefinition = typeof workflowDefinitionSchema.infer;
type WorkflowState = WorkflowDefinition["states"][number];
type WorkflowEvent = WorkflowDefinition["events"][number];
type WorkflowTransition = WorkflowDefinition["transitions"][number];

// Enhanced workflow instance with per-instance task tracking
type WorkflowInstance = {
  definition: WorkflowDefinition;
  currentState: WorkflowState;
  history: Array<{ from: WorkflowState; to: WorkflowState; at: Date }>;
  tasks: Array<WorkflowTransition["task"]>;
};

type WorkflowContext = Context & {
  workflow: {
    instance: WorkflowInstance;
  };
};

// ======== CORE FUNCTIONS ========

// Response factory function (pure function instead of context method)
const createResponse = (
  ctx: Context,
  data: unknown,
  options?: { links?: ResourceLinks; relations?: Record<string, unknown> }
): Response => {
  const body = JSON.stringify({
    ...data,
    _links: options?.links,
    _embedded: options?.relations
  });

  return new Response(body, {
    status: ctx.status,
    headers: ctx.headers
  });
};

// Safe JSON parser with explicit error handling
const safeParseBody = async (request: Request): Promise<Result<unknown, Error>> => {
  try {
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const body = await request.json();
      return { ok: true, value: body };
    }
    return { ok: false, error: new Error("Unsupported content type") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

// Functional middleware composition
const compose = <T extends Context>(middlewares: Middleware<T>[]) =>
  (ctx: T): Promise<void> =>
    middlewares.reduceRight(
      (next, middleware) => () => middleware(ctx, next),
      () => Promise.resolve()
    )();

// Context transformation helpers (immutable operations)
const withStatus = (ctx: Context, status: number): Context => ({
  ...ctx,
  status
});

const withHeader = (ctx: Context, key: string, value: string): Context => {
  const headers = new Headers(ctx.headers);
  headers.set(key, value);
  return { ...ctx, headers };
};

const withResponse = (ctx: Context, response: Response): Context => ({
  ...ctx,
  response
});

// ======== ROUTER ========
type Route = {
  pattern: URLPattern;
  handler: Middleware;
};

// Functional router implementation (no classes)
const createRouter = () => {
  // Closures for state instead of class properties
  const staticRoutes: Map<string, Map<string, Middleware>> = new Map();
  const dynamicRoutes: Route[] = [];

  // Router functions
  const add = (method: string, path: string, handler: Middleware): void => {
    // Static route optimization for exact matches
    if (!path.includes(':') && !path.includes('*')) {
      if (!staticRoutes.has(method)) {
        staticRoutes.set(method, new Map());
      }
      staticRoutes.get(method)!.set(path, handler);
      return;
    }

    // Dynamic routes with patterns
    dynamicRoutes.push({
      pattern: new URLPattern({ pathname: path, method }),
      handler
    });
  };

  const match = (request: Request): { handler: Middleware; params: Record<string, string> } | null => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Check static routes first (fast path)
    if (staticRoutes.has(method) && staticRoutes.get(method)!.has(path)) {
      return {
        handler: staticRoutes.get(method)!.get(path)!,
        params: {}
      };
    }

    // Check dynamic routes
    for (const route of dynamicRoutes) {
      const match = route.pattern.exec({
        pathname: path,
        method
      });

      if (match) {
        return {
          handler: route.handler,
          params: match.pathname.groups
        };
      }
    }

    return null;
  };

  // Return router functions
  return {
    add,
    match
  };
};

// ======== WORKFLOW FUNCTIONS ========

// Check if transition is possible
const canTransition = (instance: WorkflowInstance, event: WorkflowEvent): boolean =>
  instance.definition.transitions.some(t =>
    t.from === instance.currentState && t.on === event
  );

// Get all pending tasks
const getPendingTasks = (instance: WorkflowInstance): Array<WorkflowTransition["task"]> =>
  [...instance.tasks];

// Assign a task to workflow (pure function)
const assignTask = (instance: WorkflowInstance, task: WorkflowTransition["task"]): WorkflowInstance => ({
  ...instance,
  tasks: [...instance.tasks, task]
});

// Apply transition to workflow (pure function)
const applyTransition = (instance: WorkflowInstance, event: WorkflowEvent): WorkflowInstance => {
  const transition = instance.definition.transitions.find(t =>
    t.from === instance.currentState && t.on === event
  );

  if (!transition) {
    return instance;
  }

  // Create new history entry
  const historyEntry = {
    from: transition.from,
    to: transition.to,
    at: new Date()
  };

  // Return new instance with updated state and history
  return {
    ...instance,
    currentState: transition.to,
    history: [...instance.history, historyEntry],
    tasks: [...instance.tasks, transition.task]
  };
};

// ======== APP FACTORY ========
export const App = () => {
  const middlewares: Middleware[] = [];
  const router = createRouter();
  const controller = new AbortController();

  // Context factory with proper initialization
  const createContext = async (request: Request): Promise<Context> => {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const headerParams = Object.fromEntries(request.headers);

    // Initialize body with proper error handling
    let bodyResult: ValidationResult<unknown> = { ok: true, value: null };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const parsed = await safeParseBody(request);
      bodyResult = parsed.ok
        ? { ok: true, value: parsed.value }
        : { ok: false, error: [parsed.error.message] };
    }

    return {
      request,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      state: {},
      validated: {
        body: bodyResult,
        params: { ok: true, value: {} },
        query: { ok: true, value: queryParams },
        headers: { ok: true, value: headerParams }
      }
    };
  };

  // Main request handler with proper error handling
  const handleRequest = async (request: Request): Promise<Response> => {
    let ctx = await createContext(request);

    try {
      // Apply global middlewares first
      if (middlewares.length > 0) {
        await compose(middlewares)(ctx);

        // If middleware produced a response, return it
        if (ctx.response) {
          return ctx.response;
        }
      }

      // Route matching
      const match = router.match(request);

      if (match) {
        // Update params in context
        ctx = {
          ...ctx,
          validated: {
            ...ctx.validated,
            params: { ok: true, value: match.params }
          }
        };

        // Execute route handler
        await match.handler(ctx, () => Promise.resolve());

        // Return response if produced
        if (ctx.response) {
          return ctx.response;
        }
      }

      // No matching route or no response produced
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Request handling error:", error);
      return new Response(
        JSON.stringify({ error: "Internal Server Error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  };

  // Workflow engine factory function
  const createWorkflowEngine = <
    S extends WorkflowState = WorkflowState,
    E extends WorkflowEvent = WorkflowEvent
  >() => {
    // Closure for state
    let definition: WorkflowDefinition = {
      states: [],
      events: [],
      transitions: []
    };

    const defineTransition = (config: WorkflowTransition) => {
      const result = transitionSchema(config);
      if (result.problems) throw new Error(`Invalid transition: ${result.problems.join(", ")}`);

      definition.transitions.push(config);
      definition.states = Array.from(new Set([
        ...definition.states,
        config.from,
        config.to
      ]));
      definition.events = Array.from(new Set([
        ...definition.events,
        config.on
      ]));

      return engine;
    };

    const load = (json: unknown) => {
      const result = workflowDefinitionSchema(json);
      if (result.problems) {
        throw new Error(`Invalid workflow definition: ${result.problems.join(", ")}`);
      }
      definition = result.data;
      return engine;
    };

    const toJSON = (): WorkflowDefinition =>
      structuredClone(definition);

    const createHandler = (path: string, handler: Handler<WorkflowContext>) => {
      const enhancedHandler: Middleware = async (baseCtx, next) => {
        // Create workflow instance for this request
        const workflowInstance: WorkflowInstance = {
          definition: structuredClone(definition),
          currentState: definition.initial || definition.states[0],
          history: [],
          tasks: []
        };

        // Create workflow-enhanced context
        const workflowCtx: WorkflowContext = {
          ...baseCtx,
          workflow: {
            instance: workflowInstance
          }
        };

        await handler(workflowCtx);
        await next();
      };

      router.add("*", path, enhancedHandler);
      return engine;
    };

    const engine = {
      defineTransition,
      load,
      toJSON,
      createHandler
    };

    return engine;
  };

  // Type-safe route registration with generic parameters
  const route = <
    P extends Record<string, string> = Record<string, string>,
    Q extends Record<string, string> = Record<string, string>,
    B = unknown
  >(method: string, path: string, handler: Handler<Context & {
    validated: {
      params: ValidationResult<P>;
      query: ValidationResult<Q>;
      body: ValidationResult<B>;
      headers: ValidationResult<Record<string, string>>;
    }
  }>) => {
    const wrappedHandler: Middleware = async (ctx, next) => {
      await handler(ctx as any);
      await next();
    };

    router.add(method, path, wrappedHandler);
    return appApi; // For chaining
  };

  // Middleware registration (returns api for chaining)
  const use = (middleware: Middleware) => {
    middlewares.push(middleware);
    return appApi;
  };

  // App API
  const appApi = {
    use,
    get: <P extends Record<string, string> = Record<string, string>, Q extends Record<string, string> = Record<string, string>>(
      path: string,
      handler: Handler<Context & { validated: { params: ValidationResult<P>; query: ValidationResult<Q> } }>
    ) => route("GET", path, handler),

    post: <P extends Record<string, string> = Record<string, string>, B = unknown>(
      path: string,
      handler: Handler<Context & { validated: { params: ValidationResult<P>; body: ValidationResult<B> } }>
    ) => route("POST", path, handler),

    put: <P extends Record<string, string> = Record<string, string>, B = unknown>(
      path: string,
      handler: Handler<Context & { validated: { params: ValidationResult<P>; body: ValidationResult<B> } }>
    ) => route("PUT", path, handler),

    delete: <P extends Record<string, string> = Record<string, string>>(
      path: string,
      handler: Handler<Context & { validated: { params: ValidationResult<P> } }>
    ) => route("DELETE", path, handler),

    workflow: <S extends WorkflowState, E extends WorkflowEvent>() => createWorkflowEngine<S, E>(),

    listen: (options: Deno.ServeOptions) => {
      const serverOptions = {
        ...options,
        signal: controller.signal,
        onListen: options.onListen || (({ hostname, port }) => {
          console.log(`Server running at http://${hostname}:${port}/`);
        })
      };

      return Deno.serve(serverOptions, handleRequest);
    },

    close: () => {
      controller.abort();
    },

    // Utility functions exposed for use in handlers
    utils: {
      withStatus,
      withHeader,
      withResponse,
      createResponse,
      canTransition,
      getPendingTasks,
      assignTask,
      applyTransition
    }
  };

  return appApi;
};