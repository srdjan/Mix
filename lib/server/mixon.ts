import { type, scope } from "arktype";

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

// Type for ArkType schema
type ArkTypeSchema = {
  (input: unknown): { data: unknown; problems?: string | string[] };
};

// Enhanced validation with pattern matching
const validate = <T>(schema: ArkTypeSchema, input: unknown): ValidationResult<T> => {
  const result = schema(input);

  if (!result.problems) {
    return { ok: true, value: result.data as T };
  } else {
    return { ok: false, error: Array.isArray(result.problems) ? result.problems : [String(result.problems)] };
  }
};

// Media type constants
export enum MediaType {
  JSON = 'application/json',
  HAL = 'application/hal+json',
  HTML = 'text/html',
  ANY = '*/*'
}

// Enhanced context with response property and preferred media type
export type Context = {
  request: Request;
  status: number;
  headers: Headers;
  state: Record<string, unknown>;
  response?: Response;
  preferredMediaType: MediaType;
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

    return match<{ isJson: boolean }, Promise<Result<unknown, Error>>>({ isJson: contentType?.includes("application/json") || false })
      .with({ isJson: true }, async () => {
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
      .with({ isJson: false }, () => {
        return Promise.resolve({
          ok: false,
          error: new Error("Unsupported content type")
        });
      })
      .exhaustive();
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

// Utility functions with pattern matching
export const handleError = (ctx: Context, status: number, message: string, details?: unknown): Context => {
  ctx.status = status;

  // Use pattern matching for different error scenarios and media types
  ctx.response = match<{ mediaType: MediaType; hasDetails: boolean }, Response>({
    mediaType: ctx.preferredMediaType,
    hasDetails: details !== undefined
  })
    .with({ mediaType: MediaType.HTML }, () => {
      // HTML error response
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error ${status}</title>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .error { color: #e74c3c; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto; }
  </style>
</head>
<body>
  <h1 class="error">Error ${status}</h1>
  <p>${message}</p>
  ${details ? `<h2>Details</h2>
  <pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
</body>
</html>`;

      return new Response(errorHtml, {
        status,
        headers: { "Content-Type": MediaType.HTML }
      });
    })
    .with({ mediaType: MediaType.HAL, hasDetails: true }, () => {
      return new Response(JSON.stringify({
        error: message,
        details,
        _links: {
          help: { href: "/docs/errors" }
        }
      }), {
        status,
        headers: { "Content-Type": MediaType.HAL }
      });
    })
    .with({ mediaType: MediaType.HAL, hasDetails: false }, () => {
      return new Response(JSON.stringify({
        error: message,
        _links: {
          help: { href: "/docs/errors" }
        }
      }), {
        status,
        headers: { "Content-Type": MediaType.HAL }
      });
    })
    .with({ hasDetails: true }, () => {
      // Default JSON error response with details
      return new Response(JSON.stringify({ error: message, details }), {
        status,
        headers: { "Content-Type": MediaType.JSON }
      });
    })
    .otherwise(() => {
      // Default JSON error response without details
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": MediaType.JSON }
      });
    });

  return ctx;
};

// HTML template rendering function
export const renderHtml = (data: unknown, template?: string): string => {
  if (!template) {
    const html = `<fragment>
                    <h1>Response Data</h1>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                  </fragment>`;
    return html;
  }

  // Simple template variable replacement
  let rendered = template;
  const dataObj = typeof data === 'object' ? data : { value: data };

  for (const [key, value] of Object.entries(dataObj as Record<string, unknown>)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return rendered;
};

// Parse Accept header to determine preferred media type
export const parseAcceptHeader = (acceptHeader: string | null): MediaType => {
  if (!acceptHeader) return MediaType.JSON;

  const mediaTypes = acceptHeader.split(',').map(type => {
    const [mediaType, qualityStr] = type.trim().split(';');
    const quality = qualityStr ? parseFloat(qualityStr.split('=')[1]) : 1.0;
    return { mediaType: mediaType.trim(), quality };
  }).sort((a, b) => b.quality - a.quality);

  for (const { mediaType } of mediaTypes) {
    if (mediaType === MediaType.HAL) return MediaType.HAL;
    if (mediaType === MediaType.HTML) return MediaType.HTML;
    if (mediaType === MediaType.JSON) return MediaType.JSON;
    if (mediaType === MediaType.ANY) return MediaType.JSON; // Default to JSON for */*
  }

  return MediaType.JSON; // Default to JSON if no match
};

// Enhanced createResponse with content negotiation
export const createResponse = (ctx: Context, data: unknown, options?: {
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  template?: string; // HTML template string
  mediaType?: MediaType; // Override content negotiation
}): Response => {
  // Determine media type (explicit override or from context)
  const mediaType = options?.mediaType || ctx.preferredMediaType;

  // Use pattern matching for different response scenarios and media types
  return match<{ mediaType: MediaType; hasLinks: boolean; hasMeta: boolean }, Response>({
    mediaType,
    hasLinks: !!options?.links,
    hasMeta: !!options?.meta
  })
    // HAL format responses
    .with({ mediaType: MediaType.HAL, hasLinks: true }, () => {
      // HAL format: https://stateless.group/hal_specification.html
      const halResponse: Record<string, unknown> = {
        ...(typeof data === 'object' && data !== null ? data : { data }),
        _links: options!.links
      };

      if (options?.meta) {
        Object.assign(halResponse, { _meta: options.meta });
      }

      return new Response(JSON.stringify(halResponse), {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.HAL }
      });
    })
    // HTML responses
    .with({ mediaType: MediaType.HTML }, () => {
      let html = renderHtml(data, options?.template);

      // Add links to HTML if provided
      if (options?.links) {
        html += '\n  <div class="links">\n    <h2>Links</h2>\n    <ul>';
        for (const [rel, href] of Object.entries(options.links as Record<string, string>)) {
          html += `\n      <li><a href="${href}">${rel}</a></li>`;
        }
        html += '\n    </ul>\n  </div>';
      }

      // Add metadata to HTML if provided
      if (options?.meta) {
        html += '\n  <div class="meta">\n    <h2>Metadata</h2>\n    <pre>' +
          JSON.stringify(options.meta, null, 2) +
          '</pre>\n  </div>';
      }

      html += '\n</body>\n</html>';

      return new Response(html, {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.HTML }
      });
    })
    // Standard JSON responses
    .with({ mediaType: MediaType.JSON, hasLinks: true, hasMeta: true }, () => {
      return new Response(JSON.stringify({
        data,
        _links: options!.links,
        _meta: options!.meta
      }), {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.JSON }
      });
    })
    .with({ mediaType: MediaType.JSON, hasLinks: true, hasMeta: false }, () => {
      return new Response(JSON.stringify({
        data,
        _links: options!.links
      }), {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.JSON }
      });
    })
    .with({ mediaType: MediaType.JSON, hasLinks: false, hasMeta: true }, () => {
      return new Response(JSON.stringify({
        data,
        _meta: options!.meta
      }), {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.JSON }
      });
    })
    .otherwise(() => {
      // Default JSON response with no links or metadata
      return new Response(JSON.stringify({ data }), {
        status: ctx.status || 200,
        headers: { "Content-Type": MediaType.JSON }
      });
    });
};

export const createLinks = (resourcePath: string, id: string): Record<string, string> => {
  // Use pattern matching to handle different resource path formats
  return match<{ hasLeadingSlash: boolean }, Record<string, string>>({ hasLeadingSlash: resourcePath.startsWith('/') })
    .with({ hasLeadingSlash: true }, () => ({
      self: `${resourcePath}/${id}`,
      collection: resourcePath
    }))
    .with({ hasLeadingSlash: false }, () => ({
      self: `/${resourcePath}/${id}`,
      collection: `/${resourcePath}`
    }))
    .exhaustive();
};

// ======== ROUTER ========
// Router type definition
type Router = {
  add: (method: string, path: string, handler: Middleware) => void;
  match: (request: Request) => { handler: Middleware; params: Record<string, string> } | null;
};

export const createRouter = (): Router => {
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
// App type definition
type AppInstance = {
  use: (middleware: Middleware) => AppInstance;
  get: (path: string, handler: Handler) => AppInstance;
  post: (path: string, handler: Handler) => AppInstance;
  put: (path: string, handler: Handler) => AppInstance;
  patch: (path: string, handler: Handler) => AppInstance;
  delete: (path: string, handler: Handler) => AppInstance;
  listen: (port: number, hostname?: string) => unknown;
  workflow: () => unknown; // Using unknown instead of any
  utils: {
    createResponse: typeof createResponse;
    handleError: typeof handleError;
    createLinks: typeof createLinks;
    MediaType: typeof MediaType;
  };
};

export const App = (): AppInstance => {
  const middlewares: Middleware[] = [];
  const router = createRouter();
  const controller = new AbortController();

  // Context factory
  const createContext = async (request: Request): Promise<Context> => {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const headerParams = Object.fromEntries(request.headers);

    // Parse Accept header for content negotiation
    const acceptHeader = request.headers.get('Accept');
    const preferredMediaType = parseAcceptHeader(acceptHeader);

    const bodyResult = await match<string, Promise<ValidationResult<unknown>>>(request.method)
      .with('GET', () => Promise.resolve<ValidationResult<unknown>>({ ok: true, value: null }))
      .with('HEAD', () => Promise.resolve<ValidationResult<unknown>>({ ok: true, value: null }))
      .otherwise(async () => {
        const parsed = await safeParseBody(request);
        return match<Result<unknown, Error>, ValidationResult<unknown>>(parsed)
          .with({ ok: true }, p => ({ ok: true, value: (p as { ok: true; value: unknown }).value }))
          .with({ ok: false }, (p) => ({ ok: false, error: [(p as { ok: false; error: Error }).error.message] }))
          .exhaustive();
      });

    return {
      request,
      status: 200,
      headers: new Headers({ 'Content-Type': preferredMediaType }),
      state: {},
      preferredMediaType,
      validated: {
        body: bodyResult as ValidationResult<unknown>,
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

      return match<{ handler: Middleware; params: Record<string, string> } | null, Promise<Response>>(routeMatch)
        .with(null, () => Promise.resolve(new Response("Not Found", { status: 404 })))
        .with({}, async (rm) => {
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
      await handler(ctx as Context & {
        validated: {
          params: ValidationResult<P>;
          query: ValidationResult<Q>;
          body: ValidationResult<B>;
          headers: ValidationResult<Record<string, string>>;
        }
      });
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

    patch: <P extends Record<string, string> = Record<string, string>, B = unknown>(
      path: string,
      handler: Handler<Context & { validated: { params: ValidationResult<P>; body: ValidationResult<B> } }>
    ) => route("PATCH", path, handler),

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
      findTransition,
      handleError,
      createResponse,
      createLinks,
      renderHtml,
      parseAcceptHeader,
      MediaType
    }
  };

  return appApi;
};
