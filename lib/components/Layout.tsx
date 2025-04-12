/** @jsx h */
import { h } from "nano";
import { LayoutProps } from "./types.ts";

export const Layout = ({ title, children }: LayoutProps) => (
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <script src="https://unpkg.com/htmx.org@2.0.4"></script>
      <style>
        {`
        body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 1000px; margin: 0 auto; }
        header { margin-bottom: 2rem; }
        h1 { color: #3498db; }
        h2 { margin-top: 0; margin-bottom: 1rem; }
        h3 { margin-top: 0; margin-bottom: 0.75rem; }
        p { margin-top: 0; margin-bottom: 1rem; }
        pre { margin: 1rem 0; }
        .subtitle { color: #666; font-size: 1.2rem; margin-top: 0.5rem; }
        .card { border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .card h2 { margin-top: 0; color: #2c3e50; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { margin-bottom: 0.5rem; padding-left: 1.5rem; position: relative; }
        .feature-list li:before { content: "→"; position: absolute; left: 0; color: #3498db; }
        .btn { display: inline-block; background: #3498db; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; margin-top: 1rem; border: none; cursor: pointer; }
        .btn:hover { background: #2980b9; }
        .btn-secondary { background: #2ecc71; }
        .btn-secondary:hover { background: #27ae60; }
        .btn-small { display: inline-block; background: #3498db; color: white; padding: 0.25rem 0.5rem; text-decoration: none; border-radius: 4px; border: none; cursor: pointer; font-size: 0.8rem; }
        .btn-small:hover { background: #2980b9; }
        .btn-group { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .btn-group-column { flex-direction: column; align-items: flex-start; }
        footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #666; font-size: 0.9rem; }
        code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; }

        /* Layout */
        .container { display: flex; gap: 2rem; }
        .sidebar { width: 250px; flex-shrink: 0; }
        .content-area { flex-grow: 1; }
        .margin-bottom { margin-bottom: 1rem; }
        .margin-bottom-lg { margin-bottom: 1.5rem; }
        .margin-top { margin-top: 1rem; }
        .margin-top-lg { margin-top: 1.5rem; }
        .margin-top-xl { margin-top: 2rem; }
        .flex { display: flex; }
        .flex-gap { gap: 1rem; }

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
        .product-price-lg { font-size: 1.5rem; }
        .product-description { color: #666; margin: 0.5rem 0; font-size: 0.9rem; }

        /* Form elements */
        .search-input { padding: 0.5rem; width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; }
        .quantity-control { display: flex; align-items: center; margin: 1rem 0; }
        .quantity-btn { background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer; }
        .quantity-btn:hover { background: #e5e5e5; }
        .quantity-input { width: 50px; text-align: center; margin: 0 0.5rem; padding: 0.5rem; }

        /* Cart and notifications */
        .cart-container { position: fixed; top: 1rem; right: 1rem; z-index: 100; display: flex; align-items: center; gap: 0.5rem; }
        .cart-count { background: #3498db; color: white; padding: 0.5rem 1rem; border-radius: 4px; }
        .cart-button { background: #2ecc71; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
        .cart-button:hover { background: #27ae60; }
        .cart-notification { background: #2ecc71; color: white; padding: 1rem; margin-top: 1rem; display: none; }
        .cart-notification.active { display: block; }
        .close-btn { margin-left: 10px; background: none; border: none; color: white; cursor: pointer; }

        /* Tables */
        .cart-table { width: 100%; border-collapse: collapse; }
        .cart-table th, .cart-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .cart-table th { text-align: left; }
        .cart-table td.price, .cart-table th.price { text-align: right; }
        .cart-table td.quantity, .cart-table th.quantity { text-align: center; }
        .cart-table td.total, .cart-table th.total { text-align: right; }
        .cart-table td.actions, .cart-table th.actions { text-align: center; }
        .cart-table tr.total-row td { font-weight: bold; }

        /* Error display */
        .error-result { margin-top: 1.5rem; padding: 1rem; background: #f5f5f5; border-radius: 4px; }
        .code-block { background: #f5f5f5; padding: 1rem; overflow: auto; }
      `}
      </style>
    </head>
    <body>
      {/* Cart indicator with HTMX */}
      <div class="cart-container">
        <div class="cart-count">
          <span>Items: </span>
          <span
            id="cart-count"
            hx-get="/api/cart/count"
            hx-trigger="load, every 2s"
            hx-swap="innerHTML"
          >0</span>
        </div>
        <button
          type="button"
          class="cart-button"
          hx-get="/api/fragments/cart"
          hx-target="#content"
          hx-indicator="#spinner"
        >
          View Cart
        </button>
      </div>

      <header>
        <h1>Mixon Framework Demo</h1>
        <p class="subtitle">
          Content Negotiation & HTMX Integration with Nano JSX
        </p>
      </header>

      <div class="container">
        {/* Sidebar navigation */}
        <div class="sidebar">
          <div class="card">
            <h2>Navigation</h2>
            <ul class="nav-menu">
              <li>
                <a
                  href="#"
                  hx-get="/api/fragments/home"
                  hx-target="#content"
                  class="active"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#"
                  hx-get="/api/fragments/products"
                  hx-target="#content"
                >
                  Products
                </a>
              </li>
              <li>
                <a
                  href="#"
                  hx-get="/api/fragments/features"
                  hx-target="#content"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#"
                  hx-get="/api/fragments/api-formats"
                  hx-target="#content"
                >
                  API Formats
                </a>
              </li>
              <li>
                <a
                  href="#"
                  hx-get="/api/fragments/error-demo"
                  hx-target="#content"
                >
                  Error Demo
                </a>
              </li>
              <li>
                <a
                  href="#"
                  hx-get="/api/fragments/cart"
                  hx-target="#content"
                  hx-indicator="#spinner"
                >
                  View Cart
                </a>
              </li>
            </ul>
          </div>

          <div class="card">
            <h2>API Formats</h2>
            <div
              class="btn-group btn-group-column"
            >
              <a href="/products/format/json" class="btn" target="_blank">
                JSON
              </a>
              <a href="/products/format/hal" class="btn" target="_blank">HAL</a>
              <a href="/products/format/html" class="btn" target="_blank">
                HTML
              </a>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div class="content-area">
          {/* Content will be swapped here */}
          <div
            id="content"
            class="content-card"
            hx-get="/api/fragments/home"
            hx-trigger="load"
            hx-indicator="#spinner"
          >
            <div id="spinner" class="htmx-indicator">
              <div class="spinner"></div> Loading...
            </div>
            {children}
          </div>
        </div>
      </div>

      <footer>
        <p>
          Built with{" "}
          <a href="https://github.com/yourusername/Mixon">Mixon Framework</a>,
          {" "}
          <a href="https://htmx.org">HTMX</a>, and{" "}
          <a href="https://nanojsx.io">Nano JSX</a>.
        </p>
        <p>
          View the source code: <code>examples/workflow/workflow.tsx</code>
        </p>
      </footer>

      {/* HTMX event handling */}
      <script>
        {`
        document.body.addEventListener('click', function(e) {
          // Handle navigation menu active state
          if (e.target.matches('.nav-menu a')) {
            document.querySelectorAll('.nav-menu a').forEach(el => {
              el.classList.remove('active');
            });
            e.target.classList.add('active');
          }
        });
      `}
      </script>
    </body>
  </html>
);
