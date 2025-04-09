# Workflow Management

## Defining State Machines

```typescript
type TicketState = "Open" | "Resolved" | "Closed";
type TicketEvent = "StartProgress" | "Resolve" | "Reopen";

const workflow = app.workflow<TicketState, TicketEvent>();
```

## State Transitions

```typescript
// Programmatic definition
workflow.defineTransition({
  from: "Open",
  to: "Resolved",
  on: "Resolve",
  task: { assign: "support", message: "Ticket resolved: {id}" }
});

// JSON definition
workflow.load({
  states: ["Open", "Resolved"],
  events: ["Resolve"],
  transitions: [/*...*/],
  initial: "Open"
});
```

## Audit History

```typescript
workflow.createHandler("/tickets/:id/resolve", (ctx) => {
  ctx.applyTransition("Resolve");
  
  console.log(ctx.workflow.history);
  // [
  //   { from: "Open", to: "Resolved", at: "2024-01-01T00:00:00Z" }
  // ]
});
```

## Workflow Tips

1. Keep transition definitions in JSON files
2. Use atomic state updates
3. Version your workflow schemas
4. Separate business logic from transition handling
