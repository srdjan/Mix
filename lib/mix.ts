// mod.ts
import { type, scope, match } from "arktype";

export type { Infer } from "arktype";
export { type, scope, match };

// ======== RESULT TYPE FOR ERROR HANDLING ========
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ======== CORE TYPES ========
type Next = () => Promise<void>;
type Middleware<T extends Context = Context> = (ctx: T, next: Next) => Promise<void>;
type Handler<T extends Context = Context> = (ctx: T) => Promise<void> | void;

// Validation result type
type ValidationResult<T> = Result<T, string[]>;

// Enhanced validation with pattern matching
const validate = <T>(schema: ReturnType<typeof type>, input: unknown): ValidationResult<T> => {
  const result = schema(input);
  return match(result)
    .with({ problems: undefined }, () => ({ ok: true, value: result.data as T }))
    .with({ problems: match.array() }, ({ problems }) => ({ ok: false, error: problems }))
    .exhaustive();
};

// Resource links for HATEOAS
type ResourceLinks = Record<string,
  | string
  | { href: string; templated?: boolean }
>;

// Enhanced context with response property
// Now designed for controlled mutation
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
// Now designed for controlled mutation
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

// Response factory function (pure function)
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

// Safe JSON parser with explicit error handling and pattern matching
const safeParseBody = async (request: Request): Promise<Result<unknown, Error>> => {
  try {
    const contentType = request.headers.get("content-type");

    return match(contentType)
      .when(ct => ct?.includes("application/json"), async () => {
        try {
          const body = await request.json();
          return { ok: true, value: body };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error : new Error(String(error))
          };
        }
      })
      .otherwise(() => ({
        ok: false,
        error: new Error("Unsupported content type")
      }));

  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

// Optimized middleware composition using mutable context
const compose = <T extends Context>(middlewares: Middleware<T>[]) =>
  async (ctx: T): Promise<void> => {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }

      index = i;

      if (i === middlewares.length) {
        return;
      }

      await middlewares[i](ctx, () => dispatch(i + 1));
    };

    return dispatch(0);
  };

// Context transformation helpers (mutable for performance)
const setStatus = (ctx: Context, status: number): Context => {
  ctx.status = status;
  return ctx;
};

const setHeader = (ctx: Context, key: string, value: string): Context => {
  ctx.headers.set(key, value);
  return ctx;
};

const setResponse = (ctx: Context, response: Response): Context => {
  ctx.response = response;
  return ctx;
};

// Result handler optimized for mutable contexts
const handleResult = <T, E, R>(
  result: Result<T, E>,
  ctx: Context,
  handlers: {
    success: (value: T, ctx: Context) => R;
    failure: (error: E, ctx: Context) => R;
  }
): R =>
  match(result)
    .with({ ok: true }, ({ value }) => handlers.success(value, ctx))
    .with({ ok: false }, ({ error }) => handlers.failure(error, ctx))
    .exhaustive();

// ======== ROUTER ========
type Route = {
  pattern: URLPattern;
  handler: Middleware;
};

// CreateRouter factory function
const createRouter = () => {
  // Fast-path static routes
  const staticRoutes = new Map<string, Map<string, Middleware>>();

  // Fallback dynamic routes
  const dynamicRoutes: Route[] = [];

  // Add route to router
  const add = (method: string, path: string, handler: Middleware): void => {
    // Pattern match on path type for optimization
    match(path)
      .when(p => !p.includes(':') && !p.includes('*'), () => {
        // Static route optimization
        if (!staticRoutes.has(method)) {
          staticRoutes.set(method, new Map());
        }
        staticRoutes.get(method)!.set(path, handler);
      })
      .otherwise(() => {
        // Dynamic routes with patterns
        dynamicRoutes.push({
          pattern: new URLPattern({ pathname: path, method }),
          handler
        });
      });
  };

  // Find matching route
  const findMatch = (request: Request): { handler: Middleware; params: Record<string, string> } | null => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Fast-path: check static routes first
    if (staticRoutes.has(method) && staticRoutes.get(method)!.has(path)) {
      return {
        handler: staticRoutes.get(method)!.get(path)!,
        params: {}
      };
    }

    // Fallback: check dynamic routes
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

  return {
    add,
    match: findMatch
  };
};

// ======== WORKFLOW FUNCTIONS ========

// Workflow utility functions optimized for performance
// Now using controlled mutation

// Check if transition is possible (pure)
const canTransition = (instance: WorkflowInstance, event: WorkflowEvent): boolean =>
  instance.definition.transitions.some(t =>
    t.from === instance.currentState && t.on === event
  );

// Get all pending tasks (pure with shallow copy)
const getPendingTasks = (instance: WorkflowInstance): Array<WorkflowTransition["task"]> =>
  [...instance.tasks];

// Assign a task to workflow (mutating)
const assignTask = (instance: WorkflowInstance, task: WorkflowTransition["task"]): void => {
  instance.tasks.push(task);
};

// Apply transition to workflow (mutating)
const applyTransition = (instance: WorkflowInstance, event: WorkflowEvent): boolean => {
  const transition = instance.definition.transitions.find(t =>
    t.from === instance.currentState && t.on === event
  );

  if (!transition) {
    return false;
  }

  // Create history entry
  const historyEntry = {
    from: transition.from,
    to: transition.to,
    at: new Date()
  };

  // Update state and history in-place
  instance.history.push(historyEntry);
  instance.currentState = transition.to;

  // Add task if present
  if (transition.task) {
    instance.tasks.push(transition.task);
  }

  return true;
};

// Find transition for event
const findTransition = (
  instance: WorkflowInstance,
  event: WorkflowEvent
): WorkflowTransition | undefined =>
  instance.definition.transitions.find(t =>
    t.from === instance.currentState && t.on === event
  );

// ======== APP FACTORY ========
export const App = () => {
  const middlewares: Middleware[] = [];
  const router = createRouter();
  const controller = new AbortController();

  // Context factory (optimized)
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

    // Validate header and query params
    const headerSchema = type('record<string, string>');
    const querySchema = type('record<string, string>');

    const headerValidation = validate(headerSchema, headerParams);
    const queryValidation = validate(querySchema, queryParams);

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
        query: queryValidation,
        headers: headerValidation
      }
    };
  };

  // Main request handler with optimized flow
  const handleRequest = async (request: Request): Promise<Response> => {
    const ctx = await createContext(request);

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
      const routeMatch = router.match(request);

      if (routeMatch) {
        // Set params directly
        const paramsSchema = type('record<string, string>');
        ctx.validated.params = validate(paramsSchema, routeMatch.params);

        // Execute route handler
        await routeMatch.handler(ctx, () => Promise.resolve());

        // Return response if produced
        if (ctx.response) {
          return ctx.response;
        }

        // No response produced by handler
        return new Response(null, { status: 204 });
      }

      // No matching route
      return new Response("Not Found", { status: 404 });

    } catch (error) {
      console.error("Request handling error:", error);
      return new Response(
        JSON.stringify({ error: "Internal Server Error", details: String(error) }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  };

  // Workflow engine factory function (optimized)
  const createWorkflowEngine = <
    S extends WorkflowState = WorkflowState,
    E extends WorkflowEvent = WorkflowEvent
  >() => {
    // Workflow definition store
    let definition: WorkflowDefinition = {
      states: [],
      events: [],
      transitions: []
    };

    // Define transition with controlled mutation
    const defineTransition = (config: WorkflowTransition) => {
      const validation = validate(transitionSchema, config);

      if (!validation.ok) {
        throw new Error(`Invalid transition: ${validation.error.join(", ")}`);
      }

      // Update definition in-place
      definition.transitions.push(config);

      // Update states and events with Set for deduplication
      const stateSet = new Set(definition.states);
      stateSet.add(config.from);
      stateSet.add(config.to);
      definition.states = Array.from(stateSet);

      const eventSet = new Set(definition.events);
      eventSet.add(config.on);
      definition.events = Array.from(eventSet);

      return engine;
    };

    // Load definition with validation
    const load = (json: unknown) => {
      const validation = validate<WorkflowDefinition>(workflowDefinitionSchema, json);

      if (!validation.ok) {
        throw new Error(`Invalid workflow definition: ${validation.error.join(", ")}`);
      }

      definition = validation.value;
      return engine;
    };

    // Create JSON representation
    const toJSON = (): WorkflowDefinition => ({
      states: [...definition.states],
      events: [...definition.events],
      transitions: definition.transitions.map(t => ({ ...t })),
      initial: definition.initial
    });

    // Create workflow handler
    const createHandler = (path: string, handler: Handler<WorkflowContext>) => {
      const enhancedHandler: Middleware = async (baseCtx, next) => {
        // Create workflow instance for this request
        const workflowInstance: WorkflowInstance = {
          definition: {
            states: [...definition.states],
            events: [...definition.events],
            transitions: definition.transitions,
            initial: definition.initial
          },
          currentState: definition.initial || definition.states[0],
          history: [],
          tasks: []
        };

        // Create workflow-enhanced context
        const workflowCtx = baseCtx as WorkflowContext;
        workflowCtx.workflow = {
          instance: workflowInstance
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

  // Type-safe route registration
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
      setStatus,
      setHeader,
      setResponse,
      createResponse,
      handleResult,
      match,
      validate,

      // Workflow utilities
      canTransition,
      getPendingTasks,
      assignTask,
      applyTransition,
      findTransition
    }
  };

  return appApi;
};