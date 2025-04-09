// document_workflow.ts
import { Bix, type, scope } from "./mod.ts";

// 1. Define Workflow Types
type DocState = "Draft" | "Review" | "Approved" | "Rejected" | "Archived";
type DocEvent = "Submit" | "Approve" | "Reject" | "Revise" | "Archive";

interface Document {
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
}

// 2. Mock Database
const documents = new Map<string, Document>();

// 3. Initialize Bix with Workflow
const app = Bix();
const docWorkflow = app.workflow<DocState, DocEvent>();

// 4. Load Workflow Definition
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

// 5. Workflow Handlers
docWorkflow.createHandler("/documents", {
  schema: {
    body: type({
      title: "string>3",
      content: "string",
      author: "email"
    })
  },
  handler: (ctx) => {
    const doc: Document = {
      id: crypto.randomUUID(),
      ...ctx.validated.body.data!,
      state: "Draft",
      history: []
    };

    documents.set(doc.id, doc);

    ctx.respond(doc, {
      links: {
        self: `/documents/${doc.id}`,
        submit: { href: `/documents/${doc.id}/submit`, method: "POST" }
      }
    });
  }
});

docWorkflow.createHandler("/documents/:id/transitions", {
  schema: {
    params: type({ id: "string" }),
    body: type({
      event: docWorkflow.toJSON().events,
      user: "email",
      comments?: "string"
    })
  },
  handler: (ctx) => {
    const doc = documents.get(ctx.params.id);
    if (!doc) {
      ctx.status = 404;
      return ctx.respond({ error: "Document not found" });
    }

    const event = ctx.validated.body.data!.event;

    try {
      // Validate transition
      if (!docWorkflow.canTransition(event, doc.state)) {
        ctx.status = 400;
        return ctx.respond({ error: "Invalid transition" });
      }

      // Apply state change
      const prevState = doc.state;
      doc.state = docWorkflow.getNextState(event, doc.state)!;

      // Record history
      doc.history.push({
        from: prevState,
        to: doc.state,
        at: new Date(),
        by: ctx.validated.body.data!.user,
        comments: ctx.validated.body.data!.comments
      });

      // Handle task assignment
      const task = docWorkflow.getTaskForTransition(event, doc.state);
      if (task) {
        sendEmail(task.assign, task.message.replace("{title}", doc.title));
      }

      ctx.respond({
        currentState: doc.state,
        availableTransitions: docWorkflow.getAvailableTransitions(doc.state),
        document: doc
      }, {
        links: {
          history: `/documents/${doc.id}/history`,
          revert: doc.history.length > 0
            ? `/documents/${doc.id}/revert`
            : undefined
        }
      });

    } catch (error) {
      ctx.status = 500;
      ctx.respond({ error: "Transition failed", details: error.message });
    }
  }
});

// 6. Supporting Endpoints
app.get("/documents/:id", {
  handler: (ctx) => {
    const doc = documents.get(ctx.params.id);
    if (!doc) {
      ctx.status = 404;
      return ctx.respond({ error: "Document not found" });
    }

    ctx.respond(doc, {
      links: {
        transitions: `/documents/${doc.id}/transitions`,
        workflowDefinition: "/workflow"
      }
    });
  }
});

app.get("/documents/:id/history", {
  handler: (ctx) => {
    const doc = documents.get(ctx.params.id);
    ctx.respond(doc?.history || []);
  }
});

// 7. Start Server
app.listen({ port: 3000 });
console.log("Document Workflow API running on http://localhost:3000");

// Helper Functions
function sendEmail(to: string, message: string) {
  console.log(`[Email] To: ${to}\nMessage: ${message}`);
}