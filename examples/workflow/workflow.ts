import { App, Context } from "../../lib/mix.ts";

// Workflow Types
type DocState = "Draft" | "Review" | "Approved" | "Rejected" | "Archived";

// Document Types
type HistoryEntry = { from: DocState; to: DocState; at: Date; by: string; comments?: string };

type Document = {
  id: string;
  title: string;
  content: string;
  author: string;
  state: DocState;
  history: HistoryEntry[];
};

// Type definitions for validation
type DocData = { title: string, content: string, author: string };
type TransitionRequest = { event: string, user: string, comments?: string };

// Setup and Configuration
const documents = new Map<string, Document>();
const app = App();

// Workflow Engine
const docWorkflow = app.workflow();

// Workflow Definition
const workflowDefinition = {
  states: ["Draft", "Review", "Approved", "Rejected", "Archived"],
  events: ["Submit", "Approve", "Reject", "Revise", "Archive"],
  transitions: [
    { from: "Draft", to: "Review", on: "Submit", notify: "reviewer@company.com" },
    { from: "Review", to: "Approved", on: "Approve", notify: "author@company.com" },
    { from: "Review", to: "Rejected", on: "Reject", notify: "author@company.com" },
    { from: "Rejected", to: "Draft", on: "Revise", notify: "author@company.com" },
    { from: "Approved", to: "Archived", on: "Archive", notify: "admin@company.com" }
  ].map(t => ({
    from: t.from,
    to: t.to,
    on: t.on,
    task: {
      assign: t.notify,
      message: `Document ${t.on.toLowerCase()}ed: {title}`
    }
  })),
  initial: "Draft"
};

docWorkflow.load(workflowDefinition);

// Helper Functions
const handleError = (ctx: Context, status: number, message: string, details?: unknown) => {
  ctx.status = status;
  ctx.response = new Response(JSON.stringify({ error: message, details }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
};

const createResponse = (ctx: Context, data: unknown, options?: { links?: Record<string, unknown> }) => {
  return new Response(JSON.stringify({ data, ...(options?.links ? { _links: options.links } : {}) }), {
    status: ctx.status || 200,
    headers: { "Content-Type": "application/json" }
  });
};

const createLinks = (docId: string) => ({
  self: `/documents/${docId}`,
  transitions: `/documents/${docId}/transitions`,
  history: `/documents/${docId}/history`,
  workflow: "/workflow"
});

// Document Creation Handler
app.post("/documents", (ctx: Context) => {
  if (!ctx.validated.body.ok) {
    return handleError(ctx, 400, "Invalid document data", ctx.validated.body.error);
  }

  // Use the body value directly
  const docData = ctx.validated.body.value as DocData;
  const doc: Document = {
    id: crypto.randomUUID(),
    ...docData,
    state: "Draft" as DocState,
    history: []
  };

  documents.set(doc.id, doc);

  ctx.status = 201;
  ctx.response = createResponse(ctx, doc, { links: createLinks(doc.id) });
});

// Transition Handler

app.post("/documents/:id/transitions", (ctx: Context) => {
  // Validate request
  if (!ctx.validated.params.ok || !ctx.validated.body.ok) {
    return handleError(ctx, 400, "Invalid request data", [
      ...(ctx.validated.params.ok ? [] : ["Invalid document ID"]),
      ...(ctx.validated.body.ok ? [] : ["Invalid transition data"])
    ]);
  }

  // Get document
  const docId = ctx.validated.params.value.id;
  const doc = documents.get(docId);
  if (!doc) return handleError(ctx, 404, "Document not found");

  // Use the body value directly
  const transitionReq = ctx.validated.body.value as TransitionRequest;
  const { event, user, comments } = transitionReq;

  // Find the transition in our definition
  const transition = workflowDefinition.transitions.find(
    t => t.from === doc.state && t.on === event
  );

  if (!transition) {
    return handleError(ctx, 400, "Invalid transition", {
      currentState: doc.state,
      requestedEvent: event
    });
  }

  try {
    // Update document state
    const prevState = doc.state;
    doc.state = transition.to as DocState;
    doc.history.push({
      from: prevState,
      to: doc.state,
      at: new Date(),
      by: user,
      comments
    });

    // Send notification
    if (transition.task) {
      sendEmail(
        transition.task.assign,
        transition.task.message.replace("{title}", doc.title)
      );
    }

    // Get available transitions
    const availableTransitions = workflowDefinition.transitions
      .filter(t => t.from === doc.state)
      .map(t => t.on);

    // Return response
    ctx.response = createResponse(ctx, {
      currentState: doc.state,
      availableTransitions,
      document: doc
    }, { links: createLinks(doc.id) });
  } catch (error) {
    handleError(ctx, 500, "Transition failed",
      error instanceof Error ? error.message : String(error));
  }
});

// Document Handlers
const getDocumentById = (id: string) => documents.get(id);

// Document Retrieval Handler
app.get<{ id: string }>("/documents/:id", (ctx) => {
  if (!ctx.validated.params.ok) {
    return handleError(ctx, 400, "Invalid document ID", ctx.validated.params.error);
  }

  const docId = ctx.validated.params.value.id;
  const doc = getDocumentById(docId);

  if (!doc) return handleError(ctx, 404, "Document not found");

  ctx.response = createResponse(ctx, doc, { links: createLinks(doc.id) });
});

// Document History Handler
app.get<{ id: string }>("/documents/:id/history", (ctx) => {
  if (!ctx.validated.params.ok) {
    return handleError(ctx, 400, "Invalid document ID", ctx.validated.params.error);
  }

  const docId = ctx.validated.params.value.id;
  const doc = getDocumentById(docId);

  ctx.response = createResponse(ctx, doc?.history || []);
});

// Workflow Definition Endpoint
app.get("/workflow", (ctx) => {
  ctx.response = createResponse(ctx, docWorkflow.toJSON());
});

// Notification Function
function sendEmail(to: string, message: string) {
  console.log(`[Email] To: ${to}\nMessage: ${message}`);
}

// Start server
const port = 3000;
app.listen(port);
console.log(`Product API running at http://localhost:${port}`);


