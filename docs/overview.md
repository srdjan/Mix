# Mixon Documentation Overview

This document provides a comprehensive overview of the Mixon documentation structure, helping you navigate the available resources and find the information you need.

## Documentation Structure

The Mixon documentation is organized into several focused guides, each covering specific aspects of the framework:

| Document | Description |
|----------|-------------|
| [Core Concepts](./core-concepts.md) | Introduction to Mixon's fundamental principles and architecture |
| [API Reference](./api-reference.md) | Detailed reference for all Mixon APIs, types, and functions |
| [Workflow Guide](./workflow-guide.md) | Comprehensive guide to using Mixon's state machine workflow engine |
| [Utility Functions](./utility-functions.md) | Documentation for Mixon's helper functions and utilities |
| [HTMX Integration](./htmx-integration.md) | Guide to building interactive UIs with HTMX and Mixon |
| [Best Practices](./best-practices.md) | Recommended patterns and practices for Mixon applications |
| [Performance Optimization](./perf-optimization.md) | Techniques for optimizing Mixon application performance |
| [Memory Optimization](./mem-optimization.md) | Strategies for efficient memory usage in Mixon applications |

## Getting Started

If you're new to Mixon, we recommend starting with the following documents in order:

1. **[Core Concepts](./core-concepts.md)** - Understand Mixon's design philosophy and key features
2. **[API Reference](./api-reference.md)** - Learn about the core APIs and types
3. **[Best Practices](./best-practices.md)** - Discover recommended patterns for building Mixon applications

## Key Topics

### Type Safety

Mixon is built from the ground up with TypeScript's type system at its core. The documentation covers:

- Type-safe route parameters and validation
- Runtime type validation with ArkType
- Type-safe pattern matching with exhaustiveness checking
- Type-safe workflow state transitions

### Performance Optimization

Mixon balances functional programming principles with strategic mutation for optimal performance:

- [Performance Optimization Guide](./perf-optimization.md) covers high-throughput techniques
- [Memory Optimization Guide](./mem-optimization.md) provides memory management strategies
- [Best Practices](./best-practices.md) includes performance-related recommendations

### Workflow Engine

Mixon includes a powerful state machine implementation for modeling complex business processes:

- [Workflow Guide](./workflow-guide.md) provides comprehensive documentation
- Type-safe state transitions
- Audit trails and history tracking
- Task assignment and management

### HATEOAS and REST

Mixon supports building truly RESTful APIs with hypermedia controls:

- Content negotiation (JSON, HAL+JSON, HTML)
- HATEOAS link generation
- Resource-oriented architecture

### HTMX Integration

Build interactive web applications with minimal JavaScript:

- [HTMX Integration Guide](./htmx-integration.md) covers the basics
- Server-side rendering with content negotiation
- HTML fragment responses for HTMX requests

## Examples

Each documentation file includes practical code examples demonstrating key concepts. For complete application examples, see:

- [Product API Example](../examples/product/product-api.ts) - Basic CRUD operations
- [Workflow Example](../examples/workflow/workflow.ts) - HATEOAS and workflow state machine

## Contributing to Documentation

If you'd like to improve the Mixon documentation:

1. Fork the repository
2. Make your changes
3. Submit a pull request

We welcome contributions that improve clarity, add examples, or expand coverage of Mixon features.
