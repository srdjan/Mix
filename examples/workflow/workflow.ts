import { App, type, type ValidationResult, type WorkflowTransition } from "../../lib/mix.ts";

// 1. Define Workflow Types
type DocState = "Draft" | "Review" | "Approved" | "Rejected" | "Archived";
type DocEvent = "Submit" | "Approve" | "Reject" | "Revise" | "Archive";

// Define WorkflowContext type
type WorkflowContext = {
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
  workflow: {
    instance: {
      definition: any;
      currentState: DocState;
      history: Array<{ from: DocState; to: DocState; at: Date }>;
      tasks: Array<any>;
    }
  };
};

// Document structure
type Document = {
  id: string;
  title: string;
  content: string;
  author: string;
  state: DocState;
  history: Array<{
    from: DocState;
    to: DocState;
    at: Date;
    by: string;
    comments?: string;
  }>;
};

// Document creation schema
const createDocSchema = type({
  title: "string>3",
  content: "string",
  author: "email"
});

// Transition request schema
const transitionSchema = type({
  event: "string", // Will validate against allowed events
  user: "email",
  comments: "string|undefined" // Use union type instead of optional
});

// 2. Mock Database (direct mutation for performance)
const documents = new Map<string, Document>();

// 3. Initialize App with Workflow
const app = App();
const { utils } = app;

// 4. Create Workflow Engine
const docWorkflow = app.workflow<DocState, DocEvent>();

// 5. Load Workflow Definition
docWorkflow.load({
  states: ["Draft", "Review", "Approved", "Rejected", "Archived"],
  events: ["Submit", "Approve", "Reject", "Revise", "Archive"],
  transitions: [
    {
      from: "Draft",
      to: "Review",
      on: "Submit",
      task: {
        assign: "reviewer@company.com",
        message: "New document submitted: {title}"
      }
    },
    {
      from: "Review",
      to: "Approved",
      on: "Approve",
      task: {
        assign: "author@company.com",
        message: "Document approved: {title}"
      }
    },
    {
      from: "Review",
      to: "Rejected",
      on: "Reject",
      task: {
        assign: "author@company.com",
        message: "Document rejected: {title}"
      }
    },
    {
      from: "Rejected",
      to: "Draft",
      on: "Revise",
      task: {
        assign: "author@company.com",
        message: "Revisions requested: {title}"
      }
    },
    {
      from: "Approved",
      to: "Archived",
      on: "Archive",
      task: {
        assign: "admin@company.com",
        message: "Document archived: {title}"
      }
    }
  ],
  initial: "Draft"
});

// 6. Document Creation Handler with optimized mutation
docWorkflow.createHandler("/documents", async (ctx: WorkflowContext) => {
  if (!ctx.validated.body.ok) {
    utils.setStatus(ctx, 400);
    return utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Invalid document data",
      details: ctx.validated.body.error
    }));
  }

  const validation = utils.validate(createDocSchema, ctx.validated.body.value);

  return utils.handleResult<{title: string, content: string, author: string}, string[], void>(validation as ValidationResult<{title: string, content: string, author: string}>, ctx,
    (docData: {title: string, content: string, author: string}, ctx: any) => {
      // Create new document
      const doc: Document = {
        id: crypto.randomUUID(),
        ...docData,
        state: ctx.workflow.instance.currentState as DocState,
        history: []
      };

      // Store document (side effect at boundary)
      documents.set(doc.id, doc);

      // Return response with HATEOAS links
      utils.setStatus(ctx, 201);
      utils.setResponse(ctx, utils.createResponse(ctx, doc, {
        links: {
          self: `/documents/${doc.id}`,
          submit: { href: `/documents/${doc.id}/submit`, templated: false }
        }
      }));
      return;
    },
    (errors: string[], ctx: any) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid document data",
        details: errors
      }));
      return;
    }
  );
});

// 7. Transition Handler
docWorkflow.createHandler("/documents/:id/transitions", async (ctx: WorkflowContext) => {
  if (!ctx.validated.params.ok || !ctx.validated.body.ok) {
    utils.setStatus(ctx, 400);
    return utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Invalid request data",
      details: [
        ...(ctx.validated.params.ok ? [] : ["Invalid document ID"]),
        ...(ctx.validated.body.ok ? [] : ["Invalid transition data"])
      ]
    }));
  }

  const docId = ctx.validated.params.value.id;
  const doc = documents.get(docId);

  if (!doc) {
    utils.setStatus(ctx, 404);
    return utils.setResponse(ctx, utils.createResponse(ctx, {
      error: "Document not found"
    }));
  }

  // Validate transition data
  const transitionValidation = utils.validate<{event: string, user: string, comments?: string}>(transitionSchema, ctx.validated.body.value);

  return utils.handleResult<{event: string, user: string, comments?: string}, string[], void>(transitionValidation as ValidationResult<{event: string, user: string, comments?: string}>, ctx,
    (transitionReq: {event: string, user: string, comments?: string}, ctx: any) => {
      const { event, user, comments } = transitionReq;
      const workflowInstance = ctx.workflow.instance;

      // Check if transition is valid
      if (!utils.canTransition(workflowInstance, event)) {
        utils.setStatus(ctx, 400);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Invalid transition",
          currentState: doc.state,
          requestedEvent: event
        }));
      }

      try {
        // Find matching transition for task info
        const transition = utils.findTransition(workflowInstance, event);

        // Apply transition with mutable update (returns boolean success)
        const success = utils.applyTransition(workflowInstance, event);

        if (!success) {
          throw new Error("Transition application failed");
        }

        // Update document state (direct mutation)
        const prevState = doc.state;
        doc.state = workflowInstance.currentState as DocState;

        // Add history entry (direct mutation)
        doc.history.push({
          from: prevState,
          to: doc.state,
          at: new Date(),
          by: user,
          comments
        });

        // Handle task assignment if exists
        if (transition?.task) {
          sendEmail(
            transition.task.assign,
            transition.task.message.replace("{title}", doc.title)
          );
        }

        // Determine available transitions (optimized)
        const availableTransitions = workflowInstance.definition.transitions
          .filter((t: WorkflowTransition) => t.from === doc.state)
          .map((t: WorkflowTransition) => t.on);

        return utils.setResponse(ctx, utils.createResponse(ctx, {
          currentState: doc.state,
          availableTransitions,
          document: doc
        }, {
          links: {
            history: `/documents/${doc.id}/history`,
            revert: doc.history.length > 0
              ? `/documents/${doc.id}/revert`
              : ''
          }
        }));
      } catch (error) {
        utils.setStatus(ctx, 500);
        utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Transition failed",
          details: error instanceof Error ? error.message : String(error)
        }));
        return;
      }
    },
    (errors: string[], ctx: any) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid transition request",
        details: errors
      }));
      return;
    }
  );
});

// 8. Document Retrieval Handler
app.get<{ id: string }>("/documents/:id", async (ctx) => {
  return utils.handleResult<{id: string}, string[], void>(ctx.validated.params as ValidationResult<{id: string}>, ctx,
    (params: {id: string}, ctx: any) => {
      const docId = params.id;
      const doc = documents.get(docId);

      if (!doc) {
        utils.setStatus(ctx, 404);
        utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Document not found"
        }));
        return;
      }

      utils.setResponse(ctx, utils.createResponse(ctx, doc, {
        links: {
          transitions: `/documents/${docId}/transitions`,
          workflowDefinition: "/workflow"
        }
      }));
      return;
    },
    (errors: string[], ctx: any) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid document ID",
        details: errors
      }));
      return;
    }
  );
});

// 9. Document History Handler
app.get<{ id: string }>("/documents/:id/history", async (ctx) => {
  return utils.handleResult<{id: string}, string[], void>(ctx.validated.params as ValidationResult<{id: string}>, ctx,
    (params: {id: string}, ctx: any) => {
      const docId = params.id;
      const doc = documents.get(docId);

      // Empty array for non-existent docs (performance optimization)
      utils.setResponse(ctx, utils.createResponse(
        ctx,
        doc?.history || []
      ));
      return;
    },
    (errors: string[], ctx: any) => {
      utils.setStatus(ctx, 400);
      utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid document ID",
        details: errors
      }));
      return;
    }
  );
});

// 10. Workflow Definition Endpoint
app.get("/workflow", async (ctx) => {
  utils.setResponse(ctx, utils.createResponse(
    ctx,
    docWorkflow.toJSON()
  ));
  return;
});

// Helper Functions (isolated side effects)
function sendEmail(to: string, message: string) {
  console.log(`[Email] To: ${to}\nMessage: ${message}`);
}

// 11. Start Server with performance optimizations
const port = 3000;
app.listen({
  port: port as unknown as number,
  onListen: (info: Deno.ServeHandlerInfo) => {
    // @ts-ignore - ServeHandlerInfo may have these properties
    const hostname = info.hostname || 'localhost';
    // @ts-ignore
    const actualPort = info.port || port;
    console.log(`Document Workflow API running at http://${hostname}:${actualPort}`);
  }
});