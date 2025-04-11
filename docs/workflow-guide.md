# Mix Workflow Engine Guide

## Introduction

The Mix Workflow Engine provides a type-safe, performance-optimized state machine implementation for modeling complex business processes. It enables you to define explicit state transitions, track history, and manage tasks associated with state changes.

## Core Concepts

### State Machines

At its core, the workflow engine is built on finite state machine principles:

- **States**: Discrete conditions your business entity can be in
- **Events**: Triggers that cause transitions between states
- **Transitions**: Rules defining how states change in response to events
- **Tasks**: Actions to perform when transitions occur

### Type Safety

The workflow engine leverages TypeScript's type system to ensure type safety:

```typescript
// Define workflow states and events as union types
type OrderState = "Draft" | "Submitted" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
type OrderEvent = "Submit" | "Process" | "Ship" | "Deliver" | "Cancel";

// Create workflow with type parameters
const orderWorkflow = app.workflow<OrderState, OrderEvent>();
```

This provides compiler-level guarantees that your state transitions are valid.

## Defining Workflows

### Basic Definition

```typescript
// Create a workflow engine instance
const orderWorkflow = app.workflow<OrderState, OrderEvent>();

// Define the workflow
orderWorkflow.load({
  // Available states
  states: ["Draft", "Submitted", "Processing", "Shipped", "Delivered", "Cancelled"],
  
  // Available events
  events: ["Submit", "Process", "Ship", "Deliver", "Cancel"],
  
  // Valid transitions
  transitions: [
    { from: "Draft", to: "Submitted", on: "Submit" },
    { from: "Submitted", to: "Processing", on: "Process" },
    { from: "Processing", to: "Shipped", on: "Ship" },
    { from: "Shipped", to: "Delivered", on: "Deliver" },
    { from: "Draft", to: "Cancelled", on: "Cancel" },
    { from: "Submitted", to: "Cancelled", on: "Cancel" },
    { from: "Processing", to: "Cancelled", on: "Cancel" }
  ],
  
  // Initial state
  initial: "Draft"
});
```

### Adding Tasks

Tasks represent actions that should be performed when transitions occur:

```typescript
orderWorkflow.load({
  // ... states, events as above
  transitions: [
    { 
      from: "Draft", 
      to: "Submitted", 
      on: "Submit",
      task: {
        assign: "sales@example.com",
        message: "New order submitted: {orderNumber}"
      }
    },
    { 
      from: "Submitted", 
      to: "Processing", 
      on: "Process",
      task: {
        assign: "warehouse@example.com",
        message: "Order ready for fulfillment: {orderNumber}"
      }
    },
    // ... other transitions
  ],
});
```

### Programmatic Definition

You can also define transitions programmatically:

```typescript
// Clear initial definition
const orderWorkflow = app.workflow<OrderState, OrderEvent>();

// Add transitions one by one
orderWorkflow
  .defineTransition({
    from: "Draft",
    to: "Submitted",
    on: "Submit",
    task: {
      assign: "sales@example.com",
      message: "New order submitted: {orderNumber}"
    }
  })
  .defineTransition({
    from: "Submitted",
    to: "Processing",
    on: "Process",
    task: {
      assign: "warehouse@example.com",
      message: "Order ready for fulfillment: {orderNumber}"
    }
  })
  // Add more transitions...
```

## Using Workflows

### Creating Workflow Handlers

The `createHandler` method creates specialized handlers for workflow-enabled endpoints:

```typescript
orderWorkflow.createHandler("/orders/:id/transitions", async (ctx) => {
  // The context is enhanced with workflow functionality
  const { instance } = ctx.workflow;
  
  // Implementation details
  // ...
});
```

### Handling Transitions

The optimized workflow API provides utilities for transitions:

```typescript
orderWorkflow.createHandler("/orders/:id/transitions", async (ctx) => {
  return utils.handleResult(ctx.validated.body, ctx,
    async (body, ctx) => {
      const { event } = body;
      const { instance } = ctx.workflow;
      
      // Check if transition is possible
      if (!utils.canTransition(instance, event)) {
        utils.setStatus(ctx, 400);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Invalid transition",
          currentState: instance.currentState,
          requestedEvent: event
        }));
      }
      
      // Apply transition
      const success = utils.applyTransition(instance, event);
      
      if (!success) {
        utils.setStatus(ctx, 500);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Failed to apply transition"
        }));
      }
      
      // Update business entity with new state
      const order = await db.orders.findOne(ctx.validated.params.value.id);
      order.state = instance.currentState;
      await db.orders.update(order.id, order);
      
      // Return updated state
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        order,
        currentState: instance.currentState,
        availableEvents: getAvailableEvents(instance)
      }));
    },
    (errors, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid transition data",
        details: errors
      }));
    }
  );
});
```

### Task Management

Tasks attached to transitions can be processed after successful transitions:

```typescript
orderWorkflow.createHandler("/orders/:id/transitions", async (ctx) => {
  return utils.handleResult(ctx.validated.body, ctx,
    async (body, ctx) => {
      const { event } = body;
      const { instance } = ctx.workflow;
      
      // Apply transition
      const success = utils.applyTransition(instance, event);
      
      if (success) {
        // Find the transition that was applied to get task info
        const transition = utils.findTransition(instance, event);
        
        // Process task if present
        if (transition?.task) {
          // Example: Send notification
          await sendNotification(
            transition.task.assign,
            transition.task.message.replace(
              "{orderNumber}",
              ctx.validated.params.value.id
            )
          );
        }
        
        // Continue with response...
      }
    },
    // Error handler...
  );
});
```

## Advanced Patterns

### Pattern Matching for State Handling

Use pattern matching for exhaustive state handling:

```typescript
import { match } from "./mod.ts";

const getOrderActions = (instance: WorkflowInstance): string[] => 
  match(instance.currentState)
    .with("Draft", () => ["Submit", "Cancel"])
    .with("Submitted", () => ["Process", "Cancel"])
    .with("Processing", () => ["Ship", "Cancel"])
    .with("Shipped", () => ["Deliver"])
    .with("Delivered", () => [])
    .with("Cancelled", () => [])
    .exhaustive();
```

### Workflow History

The workflow instance maintains a history of transitions:

```typescript
// Get workflow history
const { history } = ctx.workflow.instance;

// Return history in response
return utils.setResponse(ctx, utils.createResponse(ctx, {
  order,
  currentState: instance.currentState,
  history: instance.history.map(entry => ({
    from: entry.from,
    to: entry.to,
    at: entry.at.toISOString()
  }))
}));
```

### Conditional Transitions

Implement business logic to control when transitions are allowed:

```typescript
// Extend the basic transition check with business rules
const canTransitionOrder = (
  instance: WorkflowInstance, 
  event: OrderEvent,
  order: Order
): boolean => {
  // First check workflow definition allows this transition
  if (!utils.canTransition(instance, event)) {
    return false;
  }
  
  // Then check business rules
  switch (event) {
    case "Submit":
      return order.items.length > 0 && order.totalAmount > 0;
      
    case "Process":
      return order.paymentStatus === "Paid";
      
    case "Ship":
      return order.items.every(item => item.inStock);
      
    default:
      return true;
  }
};
```

### Multiple Workflows

You can define multiple workflows for different domains:

```typescript
// Order workflow
const orderWorkflow = app.workflow<OrderState, OrderEvent>();
orderWorkflow.load(orderWorkflowDefinition);

// User onboarding workflow
type UserState = "New" | "Verified" | "Active" | "Suspended";
type UserEvent = "Verify" | "Activate" | "Suspend" | "Reinstate";

const userWorkflow = app.workflow<UserState, UserEvent>();
userWorkflow.load(userWorkflowDefinition);

// Register workflow handlers
orderWorkflow.createHandler("/orders/:id/transitions", handleOrderTransition);
userWorkflow.createHandler("/users/:id/transitions", handleUserTransition);
```

## Performance Optimization

### Transition Lookup Optimization

The workflow engine uses optimized lookups for transitions:

```typescript
// Fast transition lookup by key
const findTransition = (instance: WorkflowInstance, event: Event): Transition | undefined => {
  const key = `${instance.currentState}:${event}`;
  return instance.definition.transitionMap.get(key);
};
```

### Batch Processing

For high-throughput scenarios, process transitions in batches:

```typescript
// Batch transition processor
const processOrderBatch = async (
  orderIds: string[], 
  event: OrderEvent
): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {};
  
  // Process in parallel with concurrency limit
  const chunks = chunkArray(orderIds, 10);
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (id) => {
      try {
        const order = await db.orders.findOne(id);
        if (!order) {
          results[id] = false;
          return;
        }
        
        // Create workflow instance
        const instance: WorkflowInstance = {
          definition: orderWorkflow.toJSON(),
          currentState: order.state as OrderState,
          history: order.stateHistory || [],
          tasks: []
        };
        
        // Apply transition
        if (utils.canTransition(instance, event)) {
          const success = utils.applyTransition(instance, event);
          
          if (success) {
            // Update order
            order.state = instance.currentState;
            order.stateHistory = instance.history;
            await db.orders.update(id, order);
            
            // Process tasks
            for (const task of instance.tasks) {
              await processTask(task, order);
            }
            
            results[id] = true;
            return;
          }
        }
        
        results[id] = false;
      } catch (err) {
        console.error(`Error processing order ${id}:`, err);
        results[id] = false;
      }
    }));
  }
  
  return results;
};
```

## Error Handling

### Transition Errors

Handle transition errors explicitly:

```typescript
// Apply transition with error handling
const applyTransitionSafe = (
  instance: WorkflowInstance,
  event: Event
): Result<WorkflowInstance, TransitionError> => {
  // Check if transition is allowed
  if (!utils.canTransition(instance, event)) {
    return {
      ok: false,
      error: {
        code: "INVALID_TRANSITION",
        message: `Cannot transition from ${instance.currentState} with event ${event}`,
        currentState: instance.currentState,
        event
      }
    };
  }
  
  try {
    // Apply transition
    const success = utils.applyTransition(instance, event);
    
    if (!success) {
      return {
        ok: false,
        error: {
          code: "TRANSITION_FAILED",
          message: "Failed to apply transition",
          currentState: instance.currentState,
          event
        }
      };
    }
    
    return { ok: true, value: instance };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "TRANSITION_ERROR",
        message: err.message,
        currentState: instance.currentState,
        event,
        cause: err
      }
    };
  }
};
```

### Task Errors

Handle task processing errors:

```typescript
// Process task with error handling
const processTaskSafe = async (
  task: Task,
  context: Record<string, unknown>
): Promise<Result<void, TaskError>> => {
  try {
    // Replace placeholders in message
    let message = task.message;
    
    for (const [key, value] of Object.entries(context)) {
      message = message.replace(`{${key}}`, String(value));
    }
    
    // Process based on task type
    await sendNotification(task.assign, message);
    
    return { ok: true, value: undefined };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "TASK_FAILED",
        message: `Failed to process task: ${err.message}`,
        task,
        cause: err
      }
    };
  }
};
```

## Persistence

### Workflow Definition Persistence

Save and load workflow definitions:

```typescript
// Save workflow definition to database
const saveWorkflowDefinition = async (name: string, workflow: WorkflowDefinition) => {
  await db.workflows.upsert({ name }, {
    name,
    definition: workflow,
    updatedAt: new Date()
  });
};

// Load workflow definition from database
const loadWorkflowDefinition = async (name: string) => {
  const record = await db.workflows.findOne({ name });
  return record?.definition;
};

// Usage
const orderWorkflow = app.workflow<OrderState, OrderEvent>();

// Try to load existing definition
const savedDefinition = await loadWorkflowDefinition("order");

if (savedDefinition) {
  orderWorkflow.load(savedDefinition);
} else {
  // Create new definition
  orderWorkflow.load(defaultOrderWorkflow);
  // Save for future use
  await saveWorkflowDefinition("order", orderWorkflow.toJSON());
}
```

### Instance Persistence

Persist workflow instances with your business entities:

```typescript
// Order entity with workflow state
type Order = {
  id: string;
  customer: string;
  items: OrderItem[];
  totalAmount: number;
  state: OrderState;
  stateHistory: Array<{
    from: OrderState;
    to: OrderState;
    at: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

// Update order after transition
const updateOrderState = async (
  orderId: string,
  instance: WorkflowInstance
) => {
  // Get current order
  const order = await db.orders.findOne(orderId);
  
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }
  
  // Update order state from workflow
  order.state = instance.currentState as OrderState;
  order.stateHistory = instance.history;
  order.updatedAt = new Date();
  
  // Save updated order
  await db.orders.update(orderId, order);
  
  return order;
};
```

## Complete Example

```typescript
// order-workflow.ts
import { App, type, match } from "./mod.ts";

// Define workflow types
type OrderState = "Draft" | "Submitted" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
type OrderEvent = "Submit" | "Process" | "Ship" | "Deliver" | "Cancel";

// Order entity
type Order = {
  id: string;
  customer: string;
  items: Array<{ product: string; quantity: number; price: number }>;
  totalAmount: number;
  state: OrderState;
  stateHistory: Array<{
    from: OrderState;
    to: OrderState;
    at: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

// Transition request schema
const transitionSchema = type({
  event: ["Submit", "|", "Process", "|", "Ship", "|", "Deliver", "|", "Cancel"],
  reason: type("string").optional()
});

// Initialize app
const app = App();
const { utils } = app;

// Create workflow engine
const orderWorkflow = app.workflow<OrderState, OrderEvent>();

// Define workflow
orderWorkflow.load({
  states: ["Draft", "Submitted", "Processing", "Shipped", "Delivered", "Cancelled"],
  events: ["Submit", "Process", "Ship", "Deliver", "Cancel"],
  transitions: [
    { 
      from: "Draft", 
      to: "Submitted", 
      on: "Submit",
      task: {
        assign: "sales@example.com",
        message: "Order {id} submitted by {customer}"
      }
    },
    { 
      from: "Submitted", 
      to: "Processing", 
      on: "Process",
      task: {
        assign: "warehouse@example.com",
        message: "Order {id} ready for processing"
      }
    },
    { 
      from: "Processing", 
      to: "Shipped", 
      on: "Ship",
      task: {
        assign: "logistics@example.com",
        message: "Order {id} ready for shipping"
      }
    },
    { 
      from: "Shipped", 
      to: "Delivered", 
      on: "Deliver",
      task: {
        assign: "customer-service@example.com",
        message: "Order {id} delivered to {customer}"
      }
    },
    { from: "Draft", to: "Cancelled", on: "Cancel" },
    { from: "Submitted", to: "Cancelled", on: "Cancel" },
    { from: "Processing", to: "Cancelled", on: "Cancel" }
  ],
  initial: "Draft"
});

// Mock database
const db = {
  orders: new Map<string, Order>()
};

// Initialize with sample order
db.orders.set("order-1", {
  id: "order-1",
  customer: "John Doe",
  items: [
    { product: "Widget A", quantity: 2, price: 10.99 },
    { product: "Widget B", quantity: 1, price: 24.99 }
  ],
  totalAmount: 46.97,
  state: "Draft",
  stateHistory: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

// Task processing function
const processTask = async (task: any, order: Order) => {
  // Replace placeholders in message
  let message = task.message;
  
  for (const [key, value] of Object.entries(order)) {
    message = message.replace(`{${key}}`, String(value));
  }
  
  console.log(`[Task] To: ${task.assign}, Message: ${message}`);
};

// Get available actions for state
const getAvailableActions = (state: OrderState): OrderEvent[] => 
  match(state)
    .with("Draft", () => ["Submit", "Cancel"] as const)
    .with("Submitted", () => ["Process", "Cancel"] as const)
    .with("Processing", () => ["Ship", "Cancel"] as const)
    .with("Shipped", () => ["Deliver"] as const)
    .with("Delivered", () => [] as const)
    .with("Cancelled", () => [] as const)
    .exhaustive();

// Transition handler
orderWorkflow.createHandler("/orders/:id/transitions", async (ctx) => {
  return utils.handleResult(ctx.validated.params, ctx,
    async (params, ctx) => {
      // Get order
      const order = db.orders.get(params.id);
      
      if (!order) {
        utils.setStatus(ctx, 404);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Order not found"
        }));
      }
      
      return utils.handleResult(
        utils.validate(transitionSchema, ctx.validated.body.value),
        ctx,
        async (body, ctx) => {
          const { event } = body;
          const { instance } = ctx.workflow;
          
          // Update instance state to match order
          instance.currentState = order.state;
          instance.history = order.stateHistory;
          
          // Check if transition is possible
          if (!utils.canTransition(instance, event)) {
            utils.setStatus(ctx, 400);
            return utils.setResponse(ctx, utils.createResponse(ctx, {
              error: "Invalid transition",
              currentState: order.state,
              requestedEvent: event,
              allowedEvents: getAvailableActions(order.state)
            }));
          }
          
          // Apply transition
          const success = utils.applyTransition(instance, event);
          
          if (!success) {
            utils.setStatus(ctx, 500);
            return utils.setResponse(ctx, utils.createResponse(ctx, {
              error: "Failed to apply transition"
            }));
          }
          
          // Find transition for task
          const transition = utils.findTransition(instance, event);
          
          // Update order
          order.state = instance.currentState;
          order.stateHistory = instance.history;
          order.updatedAt = new Date();
          
          // Process task if present
          if (transition?.task) {
            await processTask(transition.task, order);
          }
          
          return utils.setResponse(ctx, utils.createResponse(ctx, {
            order,
            currentState: order.state,
            allowedEvents: getAvailableActions(order.state),
            history: order.stateHistory
          }));
        },
        (errors, ctx) => {
          utils.setStatus(ctx, 400);
          return utils.setResponse(ctx, utils.createResponse(ctx, {
            error: "Invalid transition request",
            details: errors
          }));
        }
      );
    },
    (errors, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid order ID",
        details: errors
      }));
    }
  );
});

// Get order endpoint
app.get<{ id: string }>("/orders/:id", async (ctx) => {
  return utils.handleResult(ctx.validated.params, ctx,
    async (params, ctx) => {
      const order = db.orders.get(params.id);
      
      if (!order) {
        utils.setStatus(ctx, 404);
        return utils.setResponse(ctx, utils.createResponse(ctx, {
          error: "Order not found"
        }));
      }
      
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        order,
        allowedEvents: getAvailableActions(order.state)
      }));
    },
    (errors, ctx) => {
      utils.setStatus(ctx, 400);
      return utils.setResponse(ctx, utils.createResponse(ctx, {
        error: "Invalid order ID",
        details: errors
      }));
    }
  );
});

// Start server
app.listen({
  port: 3000,
  onListen: ({ hostname, port }) => {
    console.log(`Order workflow server running on http://${hostname}:${port}`);
  }
});
