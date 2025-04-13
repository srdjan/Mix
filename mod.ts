/**
 * Mixon - Type-Safe API & Workflow Microframework for Deno
 *
 * This module exports the core functionality of the Mixon framework,
 * including the App factory, pattern matching utilities, and type validation.
 *
 * @module mixon
 */

// Export everything from the main library file
export * from "./lib/server/mixon.ts";

/**
 * Creates a new Mixon application instance.
 *
 * The App function is the main entry point for creating a Mixon application.
 * It returns an instance with methods for defining routes, adding middleware,
 * and starting the server.
 *
 * @example
 * ```typescript
 * import { App } from "jsr:@srdjan/mixon";
 *
 * const app = App();
 *
 * app.get("/hello", (ctx) => {
 *   ctx.response = new Response("Hello World");
 * });
 *
 * app.listen(3000);
 * ```
 *
 * @returns {AppInstance} A new Mixon application instance
 */
import { App as MixonApp } from "./lib/server/mixon.ts";
export const App = MixonApp;
