import { type, scope } from "arktype";

export type { Infer } from "arktype";
export { type, scope };

// Custom pattern matching implementation
type MatchResult<T, R> = {
  with: <P>(pattern: P, handler: (value: T) => R) => MatchResult<T, R>;
  when: (predicate: (value: T) => boolean, handler: () => R) => MatchResult<T, R>;
  otherwise: (fallback: () => R) => R;
  exhaustive: () => R;
};

const match = <T, R>(value: T): MatchResult<T, R> => {
  let matched = false;
  let result: R | undefined;
  
  const matchResult: MatchResult<T, R> = {
    with<P>(pattern: P, handler: (value: T) => R): MatchResult<T, R> {
      if (matched) return matchResult;
      
      if (typeof pattern === 'object' && pattern !== null) {
        const isMatch = Object.entries(pattern as Record<string, unknown>).every(([key, pValue]) => {
          const typedValue = value as Record<string, unknown>;
          if (typeof pValue === 'function' && pValue === match.array) {
            return Array.isArray(typedValue[key]);
          }
          return typedValue[key] === pValue;
        });
        
        if (isMatch) {
          matched = true;
          result = handler(value);
        }
      } else if (value === (pattern as unknown)) {
        matched = true;
        result = handler(value);
      }
      
      return matchResult;
    },
    
    when(predicate: (value: T) => boolean, handler: () => R): MatchResult<T, R> {
      if (matched) return matchResult;
      
      if (predicate(value)) {
        matched = true;
        result = handler();
      }
      
      return matchResult;
    },
    
    otherwise(fallback: () => R): R {
      return matched ? result! : fallback();
    },
    
    exhaustive(): R {
      if (!matched) {
        throw new Error(`Non-exhaustive pattern matching for: ${JSON.stringify(value)}`);
      }
      return result!;
    }
  };
  
  return matchResult;
};

// Helper for checking arrays in pattern matching
match.array = (): unknown => true;

export { match };

// ======== RESULT TYPE FOR ERROR HANDLING ========
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ======== CORE TYPES ========
type Next = () => Promise<void>;
type Middleware<T extends Context = Context> = (ctx: T, next: Next) => Promise<void>;
type Handler<T extends Context = Context> = (ctx: T) => Promise<void> | void;

// Validation result type
export type ValidationResult<T> = Result<T, string[]>;

// Enhanced validation with pattern matching
const validate = <T>(schema: ReturnType<typeof type>, input: unknown): ValidationResult<T> => {
  const result = schema(input);
  
  if (!result.problems) {
    return { ok: true, value: result.data as T };
  } else {
    return { ok: false, error: Array.isArray(result.problems) ? result.problems : [String(result.problems)] };
  }
};

// Enhanced context with response property
export type Context = {
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
type Route = {
  pattern: URLPattern;
  handler: Middleware;
};

// ======== WORKFLOW TYPES ========
type StateType = string | number | symbol;
type EventType = string;

type WorkflowState = StateType;
type WorkflowEvent = EventType;

type WorkflowTransitionTask = {
  assign: string;
  message: string;
};

type WorkflowTransition = {
  from: WorkflowState;
  to: WorkflowState;
  on: WorkflowEvent;
  task: WorkflowTransitionTask;
};

type WorkflowDefinition = {
  states: WorkflowState[];
  events: WorkflowEvent[];
  transitions: WorkflowTransition[];
  initial?: WorkflowState;
};

// Create a workflow definition validator function
const validateWorkflowDefinition = (json: unknown): ValidationResult<WorkflowDefinition> => {
  if (typeof json !== 'object' || json === null) {
    return { ok: false, error: ['Workflow definition must be an object'] };
  }
  
  const definition = json as Record<string, unknown>;
  const errors: string[] = [];
  
  // Validate states
  if (!Array.isArray(definition.states)) {
    errors.push('states must be an array');
  }
  
  // Validate events
  if (!Array.isArray(definition.events)) {
    errors.push('events must be an array');
  }
  
  // Validate transitions
  if (!Array.isArray(definition.transitions)) {
    errors.push('transitions must be an array');
  } else {
    for (let i = 0; i < definition.transitions.length; i++) {
      const t = definition.transitions[i];
      if (typeof t !== 'object' || t === null) {
        errors.push(`transitions[${i}] must be an object`);
        continue;
      }
      
      const transition = t as Record<string, unknown>;
      if (typeof transition.from === 'undefined') errors.push(`transitions[${i}].from is required`);
      if (typeof transition.to === 'undefined') errors.push(`transitions[${i}].to is required`);
      if (typeof transition.on === 'undefined') errors.push(`transitions[${i}].on is required`);
      
      if (typeof transition.task !== 'object' || transition.task === null) {
        errors.push(`transitions[${i}].task must be an object`);
      } else {
        const task = transition.task as Record<string, unknown>;
        if (typeof task.assign !== 'string') errors.push(`transitions[${i}].task.assign must be a string`);
        if (typeof task.message !== 'string') errors.push(`transitions[${i}].task.message must be a string`);
      }
    }
  }
  
  if (errors.length > 0) {
    return { ok: false, error: errors };
  }
  
  return { ok: true, value: definition as unknown as WorkflowDefinition };
};

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
// Safe JSON parser with explicit error handling and pattern matching
const safeParseBody = async (request: Request): Promise<Result<unknown, Error>> => {
  try {
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        const body = await request.json();
        return { ok: true, value: body };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    } else {
      return {
        ok: false,
        error: new Error("Unsupported content type")
      };
    }
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

// ======== CONTEXT HELPERS ========
export const setHeader = (ctx: Context, key: string, value: string): Context => {
  ctx.headers.set(key, value);
  return ctx;
};

export const setResponse = (ctx: Context, response: Response): Context => {
  ctx.response = response;
  return ctx;
};

export const handleResult = <T, E, R>(
  result: Result<T, E>,
  ctx: Context,
  handlers: {
    success: (value: T, ctx: Context) => R;
    failure: (error: E, ctx: Context) => R;
  }
): R => match<Result<T, E>, R>(result)
  .with({ ok: true }, (r) => handlers.success((r as { ok: true; value: T }).value, ctx))
  .with({ ok: false }, (r) => handlers.failure((r as { ok: false; error: E }).error, ctx))
  .exhaustive();

// ======== ROUTER ========
export const createRouter = () => {
  const staticRoutes = new Map<string, Map<string, Middleware>>();
  const dynamicRoutes: Route[] = [];

  const add = (method: string, path: string, handler: Middleware): void => {
    match({ path, hasPattern: path.includes(':') || path.includes('*') })
      .with({ hasPattern: false }, () => {
        if (!staticRoutes.has(method)) staticRoutes.set(method, new Map());
        staticRoutes.get(method)!.set(path, handler);
      })
      .with({ hasPattern: true }, () => {
        dynamicRoutes.push({
          pattern: new URLPattern({ pathname: path }),
          handler
        });
      })
      .exhaustive();
  };

  const findMatch = (request: Request): { handler: Middleware; params: Record<string, string> } | null => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Check static routes first
    if (staticRoutes.has(method) && staticRoutes.get(method)!.has(path)) {
      return { handler: staticRoutes.get(method)!.get(path)!, params: {} };
    }

    // Check dynamic routes
    for (const route of dynamicRoutes) {
      const match = route.pattern.exec({ pathname: path });
      if (match) return { handler: route.handler, params: match.pathname.groups as Record<string, string> };
    }

    return null;
  };

  return { add, match: findMatch };
};

// ======== WORKFLOW FUNCTIONS ========
export const canTransition = (instance: WorkflowInstance, event: WorkflowEvent): boolean =>
  instance.definition.transitions.some(t => t.from === instance.currentState && t.on === event);

export const getPendingTasks = (instance: WorkflowInstance): Array<WorkflowTransition["task"]> => [...instance.tasks];

export const assignTask = (instance: WorkflowInstance, task: WorkflowTransition["task"]): void => {
  instance.tasks.push(task);
};

export const applyTransition = (instance: WorkflowInstance, event: WorkflowEvent): boolean => {
  const transition = instance.definition.transitions.find(t => 
    t.from === instance.currentState && t.on === event);

  return match<WorkflowTransition | undefined, boolean>(transition)
    .with(undefined, () => false)
    .with({}, (t) => {
      instance.history.push({
        from: t!.from,
        to: t!.to,
        at: new Date()
      });
      
      instance.currentState = t!.to;
      if (t!.task) instance.tasks.push(t!.task);
      
      return true;
    })
    .exhaustive();
};

export const findTransition = (
  instance: WorkflowInstance,
  event: WorkflowEvent
): WorkflowTransition | undefined =>
  instance.definition.transitions.find(t => t.from === instance.currentState && t.on === event);

// ======== APP FACTORY ========
export const App = () => {
  const middlewares: Middleware[] = [];
  const router = createRouter();
  const controller = new AbortController();

  // Context factory
  const createContext = async (request: Request): Promise<Context> => {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const headerParams = Object.fromEntries(request.headers);
    
    const bodyResult = await match(request.method)
      .with(['GET', 'HEAD'], () => Promise.resolve<ValidationResult<unknown>>({ ok: true, value: null }))
      .otherwise(async () => {
        const parsed = await safeParseBody(request);
        return match(parsed)
          .with({ ok: true }, p => ({ ok: true, value: (p as { ok: true; value: unknown }).value }))
          .with({ ok: false }, (p) => ({ ok: false, error: [(p as { ok: false; error: Error }).error.message] }))
          .exhaustive();
      });

    return {
      request,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      state: {},
      validated: {
        body: bodyResult,
        params: { ok: true, value: {} },
        query: { ok: true, value: queryParams as Record<string, string> },
        headers: { ok: true, value: headerParams as Record<string, string> }
      }
    };
  };

  // Request handler
  const handleRequest = async (request: Request): Promise<Response> => {
    try {
      const ctx = await createContext(request);

      // Apply middlewares
      if (middlewares.length > 0) {
        await compose(middlewares)(ctx);
        if (ctx.response) return ctx.response;
      }

      // Route matching
      const routeMatch = router.match(request);
      
      return match<{ handler: Middleware; params: Record<string, string> } | null, Response>(routeMatch)
        .with(null, () => new Response("Not Found", { status: 404 }))
        .with({}, (rm) => {
          ctx.validated.params = { ok: true, value: rm!.params as Record<string, string> };
          await rm!.handler(ctx, () => Promise.resolve());
          return ctx.response || new Response(null, { status: 204 });
        })
        .exhaustive();
    } catch (error) {
      console.error("Request handling error:", error);
      return new Response(
        JSON.stringify({ error: "Internal Server Error", details: String(error) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };

  // Workflow engine factory
  const createWorkflowEngine = () => {
    let definition: WorkflowDefinition = {
      states: [],
      events: [],
      transitions: [],
      initial: undefined
    };

    const defineTransition = (config: WorkflowTransition) => {
      // Validate transition
      match(config)
        .when(c => typeof c.from === 'undefined' || 
                  typeof c.to === 'undefined' || 
                  typeof c.on !== 'string' || 
                  typeof c.task !== 'object', 
              () => { throw new Error('Invalid transition definition'); })
        .otherwise(() => {
          // Update definition
          definition.transitions.push(config);

          // Update states and events with Set for deduplication
          const stateSet = new Set(definition.states);
          stateSet.add(config.from);
          stateSet.add(config.to);
          definition.states = Array.from(stateSet);

          const eventSet = new Set(definition.events);
          eventSet.add(config.on);
          definition.events = Array.from(eventSet);
        });

      return engine;
    };

    const load = (json: unknown) => {
      const validation = validateWorkflowDefinition(json);
      
      return match(validation)
        .with({ ok: false }, v => { 
          throw new Error(`Invalid workflow definition: ${(v as { ok: false; error: string[] }).error.join(", ")}`); 
        })
        .with({ ok: true }, v => {
          definition = (v as { ok: true; value: WorkflowDefinition }).value;
          return engine;
        })
        .exhaustive();
    };

    const toJSON = (): WorkflowDefinition => ({
      states: [...definition.states],
      events: [...definition.events],
      transitions: definition.transitions.map(t => ({ ...t })),
      initial: definition.initial
    });

    const createHandler = (path: string, handler: Handler<WorkflowContext>) => {
      const enhancedHandler: Middleware = async (baseCtx, next) => {
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

        const workflowCtx = baseCtx as WorkflowContext;
        workflowCtx.workflow = { instance: workflowInstance };

        await handler(workflowCtx);
        await next();
      };

      router.add("*", path, enhancedHandler);
      return engine;
    };

    const engine = { defineTransition, load, toJSON, createHandler };
    return engine;
  };

  // Route registration
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
    router.add(method, path, async (ctx, next) => {
      await handler(ctx as any);
      await next();
    });
    return appApi;
  };

  // App API
  const appApi = {
    use: (middleware: Middleware) => {
      middlewares.push(middleware);
      return appApi;
    },
    
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

    workflow: () => createWorkflowEngine(),

    listen: (port: number) => Deno.serve({ port }, handleRequest),

    close: () => controller.abort(),

    // Utility functions exposed for use in handlers
    utils: {
      setHeader,
      setResponse,
      handleResult,
      match,
      validate,
      canTransition,
      getPendingTasks,
      assignTask,
      applyTransition,
      findTransition
    }
  };

  return appApi;
};
