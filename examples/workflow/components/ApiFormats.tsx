/** @jsx h */
import { Fragment, h } from "nano";
import { ApiFormatsProps } from "./types.ts";

export const ApiFormats = ({ product }: ApiFormatsProps) => (
  <Fragment>
    <h2>API Formats</h2>
    <p>
      Mixon supports content negotiation, allowing the same endpoint to serve
      different formats based on the Accept header.
    </p>

    <div class="card-grid" style="margin-top: 1.5rem;">
      <div class="card">
        <h3>JSON Format</h3>
        <p>Standard JSON response format:</p>
        <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">{JSON.stringify({ data: product }, null, 2)}</pre>
        <a href="/products/format/json" class="btn" target="_blank">
          View JSON Example
        </a>
      </div>

      <div class="card">
        <h3>HAL Format</h3>
        <p>Hypermedia Application Language format with _links:</p>
        <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">{JSON.stringify({
          ...product,
          _links: {
            self: { href: `/products/${product.id}` },
            collection: { href: '/products' }
          }
        }, null, 2)}</pre>
        <a href="/products/format/hal" class="btn" target="_blank">
          View HAL Example
        </a>
      </div>
    </div>

    <div style="margin-top: 2rem;">
      <h3>Content Negotiation</h3>
      <p>
        The same endpoint can return different formats based on the Accept
        header:
      </p>
      <ul>
        <li>
          <code>Accept: application/json</code> - Returns JSON
        </li>
        <li>
          <code>Accept: application/hal+json</code> - Returns HAL
        </li>
        <li>
          <code>Accept: text/html</code> - Returns HTML
        </li>
      </ul>

      <p>Try it with curl:</p>
      <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">curl -H "Accept: application/hal+json" http://localhost:3000/products</pre>
    </div>
  </Fragment>
);
