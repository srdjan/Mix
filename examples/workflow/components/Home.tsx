/** @jsx h */
import { h, Fragment } from "nano";

export const Home = () => (
  <Fragment>
    <h2>About This Demo</h2>
    <p>This example demonstrates Mix's content negotiation capabilities and HTMX integration with Nano JSX for server-side rendering. The same API endpoints can serve different formats (JSON, HAL, HTML) based on the client's Accept header.</p>
    
    <div class="feature-list">
      <h3>Key Features:</h3>
      <ul>
        <li>Content negotiation between JSON, HAL, and HTML</li>
        <li>HTMX integration for interactive UI without JavaScript</li>
        <li>Nano JSX for server-side rendering</li>
        <li>Type-safe API endpoints with validation</li>
        <li>HATEOAS-compliant hypermedia APIs</li>
        <li>Responsive design with minimal CSS</li>
      </ul>
    </div>
    
    <p>This demo uses a single-page application approach with HTMX to swap content without full page reloads. The navigation menu on the left uses HTMX to load different content fragments into this area.</p>
  </Fragment>
);
