/** @jsx h */
import { h, Fragment } from "nano";

// Types for our components
type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
};

type LayoutProps = {
  title: string;
  children: any;
};

type ProductCardProps = {
  product: Product;
  onViewDetails?: boolean;
};

type ProductListProps = {
  products: Product[];
};

type FeatureCardProps = {
  title: string;
  description: string;
  code?: string;
};

// Layout component
export const Layout = ({ title, children }: LayoutProps) => (
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <script src="https://unpkg.com/htmx.org@2.0.4"></script>
      <style>{`
        body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 1000px; margin: 0 auto; }
        header { margin-bottom: 2rem; }
        h1 { color: #3498db; }
        .subtitle { color: #666; font-size: 1.2rem; margin-top: 0.5rem; }
        .card { border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .card h2 { margin-top: 0; color: #2c3e50; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { margin-bottom: 0.5rem; padding-left: 1.5rem; position: relative; }
        .feature-list li:before { content: "→"; position: absolute; left: 0; color: #3498db; }
        .btn { display: inline-block; background: #3498db; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; margin-top: 1rem; }
        .btn:hover { background: #2980b9; }
        .btn-secondary { background: #2ecc71; }
        .btn-secondary:hover { background: #27ae60; }
        .btn-group { display: flex; gap: 0.5rem; margin-top: 1rem; }
        footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #666; font-size: 0.9rem; }
        code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; }

        /* Layout */
        .container { display: flex; gap: 2rem; }
        .sidebar { width: 250px; flex-shrink: 0; }
        .content-area { flex-grow: 1; }

        /* Navigation */
        .nav-menu { list-style: none; padding: 0; margin: 0; }
        .nav-menu li { margin-bottom: 0.5rem; }
        .nav-menu a { display: block; padding: 0.5rem; text-decoration: none; color: #333; border-radius: 4px; }
        .nav-menu a:hover { background: #f5f5f5; }
        .nav-menu a.active { background: #3498db; color: white; }

        /* Content area */
        .content-area { min-height: 400px; }
        .content-card { border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; }

        /* Loading indicator */
        .htmx-indicator { display: none; }
        .htmx-request .htmx-indicator { display: inline-block; }
        .spinner { display: inline-block; width: 1em; height: 1em; border: 2px solid rgba(0, 0, 0, 0.1); border-left-color: #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Product grid */
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .product-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; transition: transform 0.2s, box-shadow 0.2s; }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .product-name { font-size: 1.1rem; margin: 0 0 0.5rem 0; }
        .product-price { font-weight: bold; color: #2ecc71; }
        .product-description { color: #666; margin: 0.5rem 0; font-size: 0.9rem; }

        /* Cart indicator */
        .cart-indicator { position: fixed; top: 1rem; right: 1rem; background: #3498db; color: white; padding: 0.5rem 1rem; border-radius: 4px; }
      `}</style>
    </head>
    <body>
      {/* Cart indicator with HTMX */}
      <div class="cart-indicator" hx-get="/api/cart/count" hx-trigger="load, every 2s" hx-swap="innerHTML">
        Cart: 0
      </div>

      <header>
        <h1>Mix Framework Demo</h1>
        <p class="subtitle">Content Negotiation & HTMX Integration with Nano JSX</p>
      </header>

      <div class="container">
        {/* Sidebar navigation */}
        <div class="sidebar">
          <div class="card">
            <h2>Navigation</h2>
            <ul class="nav-menu">
              <li><a href="#" hx-get="/api/fragments/home" hx-target="#content" class="active">Home</a></li>
              <li><a href="#" hx-get="/api/fragments/products" hx-target="#content">Products</a></li>
              <li><a href="#" hx-get="/api/fragments/features" hx-target="#content">Features</a></li>
              <li><a href="#" hx-get="/api/fragments/api-formats" hx-target="#content">API Formats</a></li>
              <li><a href="#" hx-get="/api/fragments/error-demo" hx-target="#content">Error Demo</a></li>
            </ul>
          </div>

          <div class="card">
            <h2>API Formats</h2>
            <div class="btn-group" style="flex-direction: column; align-items: flex-start;">
              <a href="/products/format/json" class="btn" target="_blank">JSON</a>
              <a href="/products/format/hal" class="btn" target="_blank">HAL</a>
              <a href="/products/format/html" class="btn" target="_blank">HTML</a>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div class="content-area">
          {/* Content will be swapped here */}
          <div id="content" class="content-card" hx-get="/api/fragments/home" hx-trigger="load" hx-indicator="#spinner">
            <div class="htmx-indicator">
              <div class="spinner"></div> Loading...
            </div>
            {children}
          </div>
        </div>
      </div>

      <footer>
        <p>Built with <a href="https://github.com/srdjan/mix">Mix Framework</a>, <a href="https://htmx.org">HTMX</a>, and <a href="https://nanojsx.io">Nano JSX</a>.</p>
      </footer>

      {/* HTMX event handling */}
      <script>{`
        document.body.addEventListener('click', function(e) {
          // Handle navigation menu active state
          if (e.target.matches('.nav-menu a')) {
            document.querySelectorAll('.nav-menu a').forEach(el => {
              el.classList.remove('active');
            });
            e.target.classList.add('active');
          }
        });
      `}</script>
    </body>
  </html>
);

// Home component
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

// Product Card component
export const ProductCard = ({ product, onViewDetails = true }: ProductCardProps) => (
  <div class="product-card">
    <h3 class="product-name">{product.name}</h3>
    <div class="product-price">${product.price}</div>
    <p class="product-description">{product.description}</p>
    {onViewDetails && (
      <button
        class="btn"
        hx-get={`/api/fragments/product-detail/${product.id}`}
        hx-target="#content"
      >
        View Details
      </button>
    )}
  </div>
);

// Product List component
export const ProductList = ({ products }: ProductListProps) => (
  <Fragment>
    <h2>Product Catalog</h2>
    <p>Browse our product catalog with search and sorting capabilities.</p>

    {/* Search with HTMX */}
    <div style="margin-bottom: 1.5rem;">
      <input
        type="text"
        style="padding: 0.5rem; width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem;"
        placeholder="Search products..."
        hx-get="/api/products/search"
        hx-trigger="keyup changed delay:500ms"
        hx-target="#product-list"
        name="query"
      />

      {/* Sort options with HTMX */}
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
        <button
          class="btn"
          hx-get="/api/products/sort/name"
          hx-target="#product-list"
        >
          Sort by Name
        </button>
        <button
          class="btn"
          hx-get="/api/products/sort/price-asc"
          hx-target="#product-list"
        >
          Price (Low to High)
        </button>
        <button
          class="btn"
          hx-get="/api/products/sort/price-desc"
          hx-target="#product-list"
        >
          Price (High to Low)
        </button>
      </div>
    </div>

    {/* Product list with HTMX */}
    <div id="product-list" class="product-grid">
      {products.map(product => (
        <ProductCard product={product} />
      ))}
    </div>
  </Fragment>
);

// Product Detail component
export const ProductDetail = ({ product }: { product: Product }) => (
  <div>
    <div style="margin-bottom: 1rem;">
      <button class="btn" hx-get="/api/fragments/products" hx-target="#content">
        ← Back to Products
      </button>
    </div>

    <h2>{product.name}</h2>
    <div class="product-price" style="font-size: 1.5rem;">${product.price}</div>
    <div style="margin: 1rem 0;">{product.description}</div>

    {/* Quantity control with HTMX */}
    <div class="quantity-control" style="display: flex; align-items: center; margin: 1rem 0;">
      <button
        style="background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer;"
        hx-get="/api/decrement?value=1"
        hx-target="#quantity"
        hx-swap="outerHTML"
      >-</button>
      <input
        type="number"
        id="quantity"
        name="quantity"
        value="1"
        min="1"
        max="10"
        style="width: 50px; text-align: center; margin: 0 0.5rem; padding: 0.5rem;"
      />
      <button
        style="background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer;"
        hx-get="/api/increment?value=1"
        hx-target="#quantity"
        hx-swap="outerHTML"
      >+</button>
    </div>

    {/* Add to cart button with HTMX */}
    <button
      class="btn"
      style="background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; cursor: pointer; margin-top: 1rem;"
      hx-post="/api/cart/add"
      hx-vals={`{"productId": "${product.id}", "name": "${product.name}", "price": "${product.price}"}`}
      hx-target="#notification"
      hx-swap="outerHTML"
    >
      Add to Cart
    </button>

    <div id="notification" style="margin-top: 1rem;"></div>

    {/* Related products loaded with HTMX */}
    <div style="margin-top: 2rem;">
      <h3>Related Products</h3>
      <div hx-get={`/api/products/related/${product.id}`} hx-trigger="load" hx-swap="innerHTML"></div>
    </div>
  </div>
);

// Feature Card component
export const FeatureCard = ({ title, description, code }: FeatureCardProps) => (
  <div class="card">
    <h3>{title}</h3>
    <p>{description}</p>
    {code && (
      <pre><code>{code}</code></pre>
    )}
  </div>
);

// Features component
export const Features = () => (
  <Fragment>
    <h2>HTMX Features</h2>
    <p>This demo showcases several HTMX features that enable rich interactivity without writing JavaScript:</p>

    <div class="card-grid" style="margin-top: 1.5rem;">
      <FeatureCard
        title="Content Swapping"
        description="The navigation menu uses hx-target and hx-get to swap content in the main area."
        code={`hx-get="/api/fragments/home"\nhx-target="#content"`}
      />

      <FeatureCard
        title="Search with Debounce"
        description="The product search uses hx-trigger with a delay to prevent too many requests."
        code={`hx-trigger="keyup changed delay:500ms"`}
      />

      <FeatureCard
        title="Loading Indicators"
        description="The content area shows a spinner while loading using hx-indicator."
        code={`hx-indicator="#spinner"`}
      />

      <FeatureCard
        title="Lazy Loading"
        description="Related products are loaded only when needed using hx-trigger='load'."
      />

      <FeatureCard
        title="Form Submission"
        description="The Add to Cart button uses hx-post and hx-vals to submit data."
      />

      <FeatureCard
        title="Polling"
        description="The cart indicator updates every 2 seconds using hx-trigger='load, every 2s'."
      />
    </div>

    <div style="margin-top: 2rem;">
      <h3>Try It Out</h3>
      <p>Click the buttons below to see HTMX in action:</p>

      <button
        class="btn"
        hx-post="/api/demo/click-counter"
        hx-target="#click-counter"
      >Click Me</button>

      <div id="click-counter" style="margin-top: 1rem;">Click count: 0</div>
    </div>
  </Fragment>
);

// API Formats component
export const ApiFormats = ({ product }: { product: Product }) => (
  <Fragment>
    <h2>API Formats</h2>
    <p>Mix supports content negotiation, allowing the same endpoint to serve different formats based on the Accept header.</p>

    <div class="card-grid" style="margin-top: 1.5rem;">
      <div class="card">
        <h3>JSON Format</h3>
        <p>Standard JSON response format:</p>
        <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">{JSON.stringify({ data: product }, null, 2)}</pre>
        <a href="/products/format/json" class="btn" target="_blank">View JSON Example</a>
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
        <a href="/products/format/hal" class="btn" target="_blank">View HAL Example</a>
      </div>
    </div>

    <div style="margin-top: 2rem;">
      <h3>Content Negotiation</h3>
      <p>The same endpoint can return different formats based on the Accept header:</p>
      <ul>
        <li><code>Accept: application/json</code> - Returns JSON</li>
        <li><code>Accept: application/hal+json</code> - Returns HAL</li>
        <li><code>Accept: text/html</code> - Returns HTML</li>
      </ul>

      <p>Try it with curl:</p>
      <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">curl -H "Accept: application/hal+json" http://localhost:3000/products</pre>
    </div>
  </Fragment>
);

// Error Demo component
export const ErrorDemo = () => (
  <Fragment>
    <h2>Error Handling</h2>
    <p>Mix provides consistent error handling with content negotiation support.</p>

    <div class="card" style="margin-top: 1.5rem;">
      <h3>Error Examples</h3>
      <p>Click the buttons below to see different error responses:</p>

      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        <button
          class="btn"
          hx-get="/error"
          hx-target="#error-result"
        >Server Error</button>

        <button
          class="btn"
          hx-get="/products/999"
          hx-target="#error-result"
        >Not Found Error</button>

        <button
          class="btn"
          hx-get="/api/demo/validation-error"
          hx-target="#error-result"
        >Validation Error</button>
      </div>

      <div id="error-result" style="margin-top: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
        Error responses will appear here
      </div>
    </div>

    <div style="margin-top: 2rem;">
      <h3>Content Negotiation for Errors</h3>
      <p>Error responses also support content negotiation:</p>
      <ul>
        <li>HTML errors include styling and details</li>
        <li>JSON errors include error code and details</li>
        <li>HAL errors include _links for documentation</li>
      </ul>

      <p>Try it with curl:</p>
      <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">curl -H "Accept: application/json" http://localhost:3000/error</pre>
    </div>
  </Fragment>
);
