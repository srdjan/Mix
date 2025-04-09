// document_workflow.ts
import { App, type, scope, match } from "./mod.ts";

// 1. Define Workflow Types with Algebraic Data Types
type DocState = "Draft" | "Review" | "Approved" | "Rejected" | "Archived";
type DocEvent = "Submit" | "Approve" | "Reject" | "Revise" | "Archive";

// Document as immutable data structure
type Document = {
  id: string;
  title: string;
  content: string;
  author: string;
  state: DocState;
  history: ReadonlyArray<{
    from: DocState;
    to: DocState;
    at: Date;
    by: string;
    comments?: string;
  }>;
};

// Document creation request schema
const createDocSchema = type({
  title: "string>3",
  content: "string",
  author: "email"
});

// Transition request schema
const transitionSchema = type({
  event: ["Submit", "|", "Approve", "|", "Reject", "|", "Revise", "|", "Archive"],
  user: "email",
  comments: type("string").optional()
});

// 2. Pure Functions for Document Operations
const createDocument = (
  input: typeof createDocSchema.infer
): Document => ({
  id: crypto.randomUUID(),
  ...input,
  state: "Draft" as DocState,
  history: []
});

const applyDocTransition = (
  doc: Document,
  event: DocEvent,
  nextState: DocState,
  user: string,
  comments?: string
): Document => ({
  ...doc,
  state: nextState,
  history: [
    ...doc.history,
    {
      from: doc.state,
      to: nextState,
      at: new Date(),
      by: user,
      comments
    }
  ]
});

// Email sending as a pure effect descriptor
type EmailEffect = {
  type: "email";
  to: string;
  message: string;
};

const createEmailEffect = (to: string, message: string, doc: Document): EmailEffect => ({
  type: "email",
  to,
  message: message.replace("{title}", doc.title)
});

// Effect handler (side effect isolated at the boundary)
const executeEffect = (effect: EmailEffect): void => {
  if (effect.type === "email") {
    console.log(`[Email] To: ${effect.to}\nMessage: ${effect.message}`);
  }
};

// 3. Initialize App with Workflow
const app = App();
const { utils } = app;

// 4. Setup Document Store
const documents = new Map<string, Document>();

// 5. Create Workflow Engine
const docWorkflow = app.workflow<DocState, DocEvent>();

// 6. Load Workflow Definition
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

// 7. Document Creation Handler
docWorkflow.createHandler("/documents", async (ctx) => {
  return utils.handleResult(
    utils.validate(createDocSchema, ctx.validated.body.value), docData => {
      // Create new document (pure operation)
      const doc = createDocument(docData);

      // Store document (side effect at boundary)
      documents.set(doc.id, doc);

      // Return response with HATEOAS links
      return utils.withResponse(
        utils.withStatus(ctx, 201),
        utils.createResponse(ctx, doc, {
          links: {
            self: `/documents/${doc.id}`,
            submit: { href: `/documents/${doc.id}/submit`, templated: false }
          }
        })
      );
    },
    errors => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid document data",
        details: errors
      })
    )
  );
});

// 8. Transition Handler
docWorkflow.createHandler("/documents/:id/transitions", async (ctx) => {
  // Validate parameters
  return utils.handleResult(
    ctx.validated.params,
    params => {
      const docId = params.id;
      const doc = documents.get(docId);

      return utils.match(doc)
        .with(match.undefined, () => utils.withResponse(
          utils.withStatus(ctx, 404),
          utils.createResponse(ctx, { error: "Document not found" })
        ))
        .otherwise(doc => handleDocumentTransition(ctx, doc));
    },
    errors => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid document ID",
        details: errors
      })
    )
  );
});

// Helper function for document transitions
const handleDocumentTransition = async (ctx: any, doc: Document) => {
  return utils.handleResult(
    utils.validate(transitionSchema, ctx.validated.body.value),
    transitionRequest => {
      const { event, user, comments } = transitionRequest;
      const workflowInstance = ctx.workflow.instance;

      // Check if transition is valid
      const canTransition = utils.canTransition(workflowInstance, event);

      return utils.match(canTransition)
        .when(false, () => utils.withResponse(
          utils.withStatus(ctx, 400),
          utils.createResponse(ctx, {
            error: "Invalid transition",
            currentState: doc.state,
            requestedEvent: event
          })
        ))
        .otherwise(() => {
          try {
            // Apply transition to workflow (pure operation)
            const updatedInstance = utils.applyTransition(workflowInstance, event);

            // Determine next state
            const nextState = updatedInstance.currentState as DocState;

            // Apply transition to document (pure operation)
            const updatedDoc = applyDocTransition(doc, event, nextState, user, comments);

            // Update document in store (side effect at boundary)
            documents.set(doc.id, updatedDoc);

            // Find matching transition for task
            const transition = workflowInstance.definition.transitions.find(t =>
              t.from === doc.state && t.on === event
            );

            // Handle task assignment if exists (side effect at boundary)
            if (transition?.task) {
              const emailEffect = createEmailEffect(
                transition.task.assign,
                transition.task.message,
                updatedDoc
              );
              executeEffect(emailEffect);
            }

            // Determine available transitions
            const availableTransitions = workflowInstance.definition.transitions
              .filter(t => t.from === nextState)
              .map(t => t.on);

            // Build response
            return utils.withResponse(
              ctx,
              utils.createResponse(ctx, {
                currentState: updatedDoc.state,
                availableTransitions,
                document: updatedDoc
              }, {
                links: {
                  history: `/documents/${doc.id}/history`,
                  revert: updatedDoc.history.length > 0
                    ? `/documents/${doc.id}/revert`
                    : undefined
                }
              })
            );
          } catch (error) {
            return utils.withResponse(
              utils.withStatus(ctx, 500),
              utils.createResponse(ctx, {
                error: "Transition failed",
                details: error instanceof Error ? error.message : String(error)
              })
            );
          }
        });
    },
    errors => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid transition request",
        details: errors
      })
    )
  );
};

// 9. Document Retrieval Handler
app.get<{ id: string }>("/documents/:id", async (ctx) => {
  return utils.handleResult(
    ctx.validated.params,
    params => {
      const docId = params.id;
      const doc = documents.get(docId);

      return utils.match(doc)
        .with(match.defined, doc => utils.withResponse(
          ctx,
          utils.createResponse(ctx, doc, {
            links: {
              transitions: `/documents/${docId}/transitions`,
              workflowDefinition: "/workflow"
            }
          })
        ))
        .otherwise(() => utils.withResponse(
          utils.withStatus(ctx, 404),
          utils.createResponse(ctx, { error: "Document not found" })
        ));
    },
    errors => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid document ID",
        details: errors
      })
    )
  );
});

// 10. Document History Handler
app.get<{ id: string }>("/documents/:id/history", async (ctx) => {
  return utils.handleResult(
    ctx.validated.params,
    params => {
      const docId = params.id;
      const doc = documents.get(docId);

      return utils.withResponse(
        ctx,
        utils.createResponse(ctx, doc?.history || [])
      );
    },
    errors => utils.withResponse(
      utils.withStatus(ctx, 400),
      utils.createResponse(ctx, {
        error: "Invalid document ID",
        details: errors
      })
    )
  );
});

// 11. Workflow Definition Endpoint
app.get("/workflow", async (ctx) => {
  return utils.withResponse(
    ctx,
    utils.createResponse(ctx, docWorkflow.toJSON())
  );
});

// 12. Start Server
const port = 3000;
app.listen({
  port,
  onListen: ({ hostname, port }) => {
    console.log(`Document Workflow API running on http://${hostname}:${port}`);
  }
});