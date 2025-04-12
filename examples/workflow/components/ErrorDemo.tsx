/** @jsx h */
import { Fragment, h } from "nano";

export const ErrorDemo = () => (
  <Fragment>
    {/* Hidden spinner for HTMX indicators */}
    <div id="spinner" class="htmx-indicator">
      <div class="spinner"></div> Loading...
    </div>
    <h2>Error Handling</h2>
    <p>
      Mixon provides consistent error handling with content negotiation support.
    </p>

    <div class="card margin-top-lg">
      <h3>Error Examples</h3>
      <p>Click the buttons below to see different error responses:</p>

      <div class="flex flex-gap margin-top">
        <button
          type="button"
          class="btn"
          hx-get="/error"
          hx-target="#error-result"
        >
          Server Error
        </button>

        <button
          type="button"
          class="btn"
          hx-get="/products/999"
          hx-target="#error-result"
        >
          Not Found Error
        </button>

        <button
          type="button"
          class="btn"
          hx-get="/api/demo/validation-error"
          hx-target="#error-result"
        >
          Validation Error
        </button>
      </div>

      <div
        id="error-result"
        class="error-result"
      >
        Error responses will appear here
      </div>
    </div>

    <div class="margin-top-xl">
      <h3>Content Negotiation for Errors</h3>
      <p>Error responses also support content negotiation:</p>
      <ul>
        <li>HTML errors include styling and details</li>
        <li>JSON errors include error code and details</li>
        <li>HAL errors include _links for documentation</li>
      </ul>

      <p>Try it with curl:</p>
      <pre class="code-block">curl -H "Accept: application/json" http://localhost:3000/error</pre>
    </div>
  </Fragment>
);
