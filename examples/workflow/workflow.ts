import { App } from "../../lib/mix.ts";

const app = App();
const { utils } = app;
const { MediaType, createResponse, handleError } = utils;

// Sample data
const products = [
  { id: "1", name: "Laptop", price: 999.99, description: "Powerful laptop with 16GB RAM" },
  { id: "2", name: "Smartphone", price: 699.99, description: "Latest model with 5G support" },
  { id: "3", name: "Headphones", price: 199.99, description: "Noise-cancelling wireless headphones" }
];

// Root route - Home page
app.get("/", (ctx): void => {
  const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mix Framework Demo</title>
  <script src="https://unpkg.com/htmx.org@1.9.6"></script>
  <style>
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
  </style>
</head>
<body>
  <!-- Cart indicator with HTMX -->
  <div class="cart-indicator" hx-get="/api/cart/count" hx-trigger="load, every 2s" hx-swap="innerHTML">Cart: 0</div>

  <header>
    <h1>Mix Framework Demo</h1>
    <p class="subtitle">Content Negotiation & HTMX Integration</p>
  </header>

  <div class="container">
    <!-- Sidebar navigation -->
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

    <!-- Main content area -->
    <div class="content-area">
      <!-- Content will be swapped here -->
      <div id="content" class="content-card" hx-get="/api/fragments/home" hx-trigger="load" hx-indicator="#spinner">
        <div class="htmx-indicator">
          <div class="spinner"></div> Loading...
        </div>
      </div>
    </div>
  </div>

  <footer>
    <p>Built with <a href="https://github.com/yourusername/mix">Mix Framework</a> and <a href="https://htmx.org">HTMX</a>.</p>
    <p>View the source code: <code>examples/workflow/workflow.ts</code></p>
  </footer>

  <!-- HTMX event handling -->
  <script>
    document.body.addEventListener('click', function(e) {
      // Handle navigation menu active state
      if (e.target.matches('.nav-menu a')) {
        document.querySelectorAll('.nav-menu a').forEach(el => {
          el.classList.remove('active');
        });
        e.target.classList.add('active');
      }
    });
  </script>
</body>
</html>`;

  ctx.response = createResponse(ctx, { title: "Mix Framework Demo" }, {
    mediaType: MediaType.HTML,
    template,
    links: {
      self: "/",
      products: "/products",
      api: "/products/format/json"
    }
  });
});

// Get all products - demonstrates automatic content negotiation
app.get("/products", (ctx): void => {
  // Response format determined by Accept header
  ctx.response = createResponse(ctx, products, {
    links: {
      self: "/products"
    },
    meta: {
      count: products.length,
      version: "1.0"
    }
  });
});

// Get product by ID - demonstrates content negotiation with templates
app.get<{ id: string }>("/products/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    handleError(ctx, 400, "Invalid product ID", ctx.validated.params.error);
    return;
  }

  const productId = ctx.validated.params.value.id;
  const product = products.find(p => p.id === productId);

  if (!product) {
    handleError(ctx, 404, "Product not found");
    return;
  }

  // HTML template for product details with HTMX
  const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{name}} - Product Details</title>
  <!-- Include HTMX for interactive features -->
  <script src="https://unpkg.com/htmx.org@1.9.6"></script>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .price { font-size: 1.5rem; color: #2ecc71; font-weight: bold; }
    .description { margin: 1rem 0; }
    .back-link { display: inline-block; margin-top: 1rem; color: #3498db; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .quantity-control { display: flex; align-items: center; margin: 1rem 0; }
    .quantity-control button { background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer; }
    .quantity-control button:hover { background: #e5e5e5; }
    .quantity-control input { width: 50px; text-align: center; margin: 0 0.5rem; padding: 0.5rem; }
    .add-to-cart { background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; cursor: pointer; margin-top: 1rem; }
    .add-to-cart:hover { background: #2980b9; }
    .cart-notification { background: #2ecc71; color: white; padding: 1rem; margin-top: 1rem; display: none; }
    .related-products { margin-top: 2rem; }
    .related-products h2 { margin-bottom: 1rem; }
    .related-products ul { list-style: none; padding: 0; }
    .related-products li { margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>{{name}}</h1>
  <p class="price">$${product.price}</p>
  <div class="description">{{description}}</div>

  <!-- Quantity control with HTMX -->
  <div class="quantity-control">
    <button hx-get="/api/decrement" hx-target="#quantity" hx-swap="outerHTML">-</button>
    <input type="number" id="quantity" name="quantity" value="1" min="1" max="10">
    <button hx-get="/api/increment" hx-target="#quantity" hx-swap="outerHTML">+</button>
  </div>

  <!-- Add to cart button with HTMX -->
  <button class="add-to-cart"
    hx-post="/api/cart/add"
    hx-vals='{"productId": "{{id}}", "name": "{{name}}", "price": "{{price}}"}'
    hx-target="#cart-notification"
    hx-swap="outerHTML">
    Add to Cart
  </button>

  <div id="cart-notification" class="cart-notification"></div>

  <!-- Related products loaded with HTMX -->
  <div class="related-products">
    <h2>Related Products</h2>
    <div hx-get="/api/products/related/{{id}}" hx-trigger="load" hx-swap="innerHTML"></div>
  </div>

  <a href="/products" class="back-link" hx-boost="true">← Back to all products</a>
</body>`;

  // Response with links
  ctx.response = createResponse(ctx, product, {
    template, // Used for HTML responses
    links: {
      self: `/products/${product.id}`,
      collection: "/products"
    }
  });
});

// Force specific format regardless of Accept header
app.get("/products/format/json", (ctx): void => {
  ctx.response = createResponse(ctx, products, {
    mediaType: MediaType.JSON, // Force JSON format
    links: {
      self: "/products/format/json"
    }
  });
});

app.get("/products/format/hal", (ctx): void => {
  ctx.response = createResponse(ctx, products, {
    mediaType: MediaType.HAL, // Force HAL format
    links: {
      self: { href: "/products/format/hal" },
      collection: { href: "/products" }
    }
  });
});

app.get("/products/format/html", (ctx): void => {
  // Create an enhanced HTML template with HTMX for the product list
  const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Products Catalog</title>
  <script src="https://unpkg.com/htmx.org@1.9.6"></script>
  <style>
    body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 2rem; }
    .product-card { border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; }
    .product-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
    .product-name { font-size: 1.2rem; margin: 0 0 0.5rem 0; }
    .product-price { font-weight: bold; color: #2ecc71; }
    .product-description { color: #666; margin: 0.5rem 0; }
    .view-button { display: inline-block; background: #3498db; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; margin-top: 1rem; }
    .view-button:hover { background: #2980b9; }
    .search-container { margin-bottom: 2rem; }
    .search-input { padding: 0.75rem; width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; }
    .sort-options { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .sort-option { background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px; }
    .sort-option.active { background: #3498db; color: white; }
    .cart-indicator { position: fixed; top: 1rem; right: 1rem; background: #3498db; color: white; padding: 0.5rem 1rem; border-radius: 4px; }
  </style>
</head>
<body>
  <!-- Cart indicator with HTMX -->
  <div class="cart-indicator" hx-get="/api/cart/count" hx-trigger="load, every 2s" hx-swap="innerHTML">Cart: 0</div>

  <h1>Products Catalog</h1>

  <!-- Search with HTMX -->
  <div class="search-container">
    <input type="text"
      class="search-input"
      placeholder="Search products..."
      hx-get="/api/products/search"
      hx-trigger="keyup changed delay:500ms"
      hx-target="#product-list"
      name="query">

    <!-- Sort options with HTMX -->
    <div class="sort-options">
      <button class="sort-option active"
        hx-get="/api/products/sort/name"
        hx-target="#product-list">Name</button>
      <button class="sort-option"
        hx-get="/api/products/sort/price-asc"
        hx-target="#product-list">Price (Low to High)</button>
      <button class="sort-option"
        hx-get="/api/products/sort/price-desc"
        hx-target="#product-list">Price (High to Low)</button>
    </div>
  </div>

  <!-- Product list with HTMX -->
  <div id="product-list" class="product-grid">
    ${products.map(product => `
      <div class="product-card">
        <h2 class="product-name">${product.name}</h2>
        <div class="product-price">$${product.price}</div>
        <p class="product-description">${product.description}</p>
        <a href="/products/${product.id}" class="view-button" hx-boost="true">View Details</a>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  ctx.response = createResponse(ctx, products, {
    mediaType: MediaType.HTML, // Force HTML format
    template,
    links: {
      self: "/products/format/html",
      json: "/products/format/json",
      hal: "/products/format/hal"
    }
  });
});

// HTMX API endpoints for interactive features

// Increment quantity
app.get("/api/increment", (ctx): void => {
  // Get the current value from the query parameter
  let currentValue = 1;
  if (ctx.validated.query.ok && ctx.validated.query.value.value) {
    currentValue = parseInt(ctx.validated.query.value.value, 10);
  }
  const newValue = Math.min(currentValue + 1, 10); // Max 10

  // Return just the HTML for the input element
  ctx.response = new Response(
    `<input type="number" id="quantity" name="quantity" value="${newValue}" min="1" max="10">`,
    { headers: { "Content-Type": "text/html" } }
  );
});

// Decrement quantity
app.get("/api/decrement", (ctx): void => {
  // Get the current value from the query parameter
  let currentValue = 1;
  if (ctx.validated.query.ok && ctx.validated.query.value.value) {
    currentValue = parseInt(ctx.validated.query.value.value, 10);
  }
  const newValue = Math.max(currentValue - 1, 1); // Min 1

  // Return just the HTML for the input element
  ctx.response = new Response(
    `<input type="number" id="quantity" name="quantity" value="${newValue}" min="1" max="10">`,
    { headers: { "Content-Type": "text/html" } }
  );
});

// Add to cart
app.post("/api/cart/add", (ctx): void => {
  // In a real app, you would add to a session-based cart
  // Here we just return a success message
  ctx.response = new Response(
    `<div id="cart-notification" class="cart-notification" style="display: block;">
      Item added to cart successfully!
      <button hx-get="/api/cart/hide-notification" hx-target="#cart-notification" hx-swap="outerHTML" style="margin-left: 10px; background: none; border: none; color: white; cursor: pointer;">✕</button>
    </div>`,
    { headers: { "Content-Type": "text/html" } }
  );
});

// Hide cart notification
app.get("/api/cart/hide-notification", (ctx): void => {
  ctx.response = new Response(
    `<div id="cart-notification" class="cart-notification"></div>`,
    { headers: { "Content-Type": "text/html" } }
  );
});

// Get cart count
app.get("/api/cart/count", (ctx): void => {
  // In a real app, you would get the actual cart count from a session
  const count = Math.floor(Math.random() * 5); // Simulate random cart count for demo
  ctx.response = new Response(
    `Cart: ${count}`,
    { headers: { "Content-Type": "text/html" } }
  );
});

// Get related products
app.get<{ id: string }>("/api/products/related/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    ctx.response = new Response("Invalid product ID", { status: 400 });
    return;
  }

  const productId = ctx.validated.params.value.id;
  // Filter out the current product and get 2 random products
  const relatedProducts = products
    .filter(p => p.id !== productId)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  ctx.response = new Response(
    `<ul>
      ${relatedProducts.map(p => `
        <li>
          <a href="/products/${p.id}" hx-boost="true">${p.name} - $${p.price}</a>
        </li>
      `).join('')}
    </ul>`,
    { headers: { "Content-Type": "text/html" } }
  );
});

// Search products
app.get("/api/products/search", (ctx): void => {
  let query = "";
  if (ctx.validated.query.ok && ctx.validated.query.value.query) {
    query = ctx.validated.query.value.query.toLowerCase();
  }

  const filteredProducts = query ?
    products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    ) :
    products;

  ctx.response = new Response(
    filteredProducts.map(product => `
      <div class="product-card">
        <h2 class="product-name">${product.name}</h2>
        <div class="product-price">$${product.price}</div>
        <p class="product-description">${product.description}</p>
        <a href="/products/${product.id}" class="view-button" hx-boost="true">View Details</a>
      </div>
    `).join(''),
    { headers: { "Content-Type": "text/html" } }
  );
});

// Sort products
app.get("/api/products/sort/:method", (ctx): void => {
  if (!ctx.validated.params.ok) {
    ctx.response = new Response("Invalid sort method", { status: 400 });
    return;
  }

  const method = ctx.validated.params.value.method;
  const sortedProducts = [...products];

  switch (method) {
    case "name":
      sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price-asc":
      sortedProducts.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sortedProducts.sort((a, b) => b.price - a.price);
      break;
  }

  ctx.response = new Response(
    sortedProducts.map(product => `
      <div class="product-card">
        <h2 class="product-name">${product.name}</h2>
        <div class="product-price">$${product.price}</div>
        <p class="product-description">${product.description}</p>
        <a href="/products/${product.id}" class="view-button" hx-boost="true">View Details</a>
      </div>
    `).join(''),
    { headers: { "Content-Type": "text/html" } }
  );
});

// HTML Fragment API endpoints for content area

// Home fragment
app.get("/api/fragments/home", (ctx): void => {
  ctx.response = new Response(`
    <h2>About This Demo</h2>
    <p>This example demonstrates Mix's content negotiation capabilities and HTMX integration. The same API endpoints can serve different formats (JSON, HAL, HTML) based on the client's Accept header.</p>

    <div class="feature-list">
      <h3>Key Features:</h3>
      <ul>
        <li>Content negotiation between JSON, HAL, and HTML</li>
        <li>HTMX integration for interactive UI without JavaScript</li>
        <li>Type-safe API endpoints with validation</li>
        <li>HATEOAS-compliant hypermedia APIs</li>
        <li>Responsive design with minimal CSS</li>
      </ul>
    </div>

    <p>This demo uses a single-page application approach with HTMX to swap content without full page reloads. The navigation menu on the left uses HTMX to load different content fragments into this area.</p>
  `, { headers: { "Content-Type": "text/html" } });
});

// Products fragment
app.get("/api/fragments/products", (ctx): void => {
  ctx.response = new Response(`
    <h2>Product Catalog</h2>
    <p>Browse our product catalog with search and sorting capabilities.</p>

    <!-- Search with HTMX -->
    <div style="margin-bottom: 1.5rem;">
      <input type="text"
        style="padding: 0.5rem; width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem;"
        placeholder="Search products..."
        hx-get="/api/products/search"
        hx-trigger="keyup changed delay:500ms"
        hx-target="#product-list"
        name="query">

      <!-- Sort options with HTMX -->
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
        <button class="btn"
          hx-get="/api/products/sort/name"
          hx-target="#product-list">Sort by Name</button>
        <button class="btn"
          hx-get="/api/products/sort/price-asc"
          hx-target="#product-list">Price (Low to High)</button>
        <button class="btn"
          hx-get="/api/products/sort/price-desc"
          hx-target="#product-list">Price (High to Low)</button>
      </div>
    </div>

    <!-- Product list with HTMX -->
    <div id="product-list" class="product-grid">
      ${products.map(product => `
        <div class="product-card">
          <h3 class="product-name">${product.name}</h3>
          <div class="product-price">$${product.price}</div>
          <p class="product-description">${product.description}</p>
          <button class="btn"
            hx-get="/api/fragments/product-detail/${product.id}"
            hx-target="#content">View Details</button>
        </div>
      `).join('')}
    </div>
  `, { headers: { "Content-Type": "text/html" } });
});

// Product detail fragment
app.get<{ id: string }>("/api/fragments/product-detail/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    ctx.response = new Response("<div class='card'>Invalid product ID</div>", {
      status: 400,
      headers: { "Content-Type": "text/html" }
    });
    return;
  }

  const productId = ctx.validated.params.value.id;
  const product = products.find(p => p.id === productId);

  if (!product) {
    ctx.response = new Response("<div class='card'>Product not found</div>", {
      status: 404,
      headers: { "Content-Type": "text/html" }
    });
    return;
  }

  ctx.response = new Response(`
    <div>
      <div style="margin-bottom: 1rem;">
        <button class="btn" hx-get="/api/fragments/products" hx-target="#content">
          ← Back to Products
        </button>
      </div>

      <h2>${product.name}</h2>
      <div class="product-price" style="font-size: 1.5rem;">$${product.price}</div>
      <div style="margin: 1rem 0;">${product.description}</div>

      <!-- Quantity control with HTMX -->
      <div class="quantity-control" style="display: flex; align-items: center; margin: 1rem 0;">
        <button
          style="background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer;"
          hx-get="/api/decrement?value=1"
          hx-target="#quantity"
          hx-swap="outerHTML">-</button>
        <input type="number" id="quantity" name="quantity" value="1" min="1" max="10"
          style="width: 50px; text-align: center; margin: 0 0.5rem; padding: 0.5rem;">
        <button
          style="background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer;"
          hx-get="/api/increment?value=1"
          hx-target="#quantity"
          hx-swap="outerHTML">+</button>
      </div>

      <!-- Add to cart button with HTMX -->
      <button class="btn"
        style="background: #3498db; color: white; border: none; padding: 0.75rem 1.5rem; cursor: pointer; margin-top: 1rem;"
        hx-post="/api/cart/add"
        hx-vals='{"productId": "${product.id}", "name": "${product.name}", "price": "${product.price}"}'
        hx-target="#notification"
        hx-swap="outerHTML">
        Add to Cart
      </button>

      <div id="notification" style="margin-top: 1rem;"></div>

      <!-- Related products loaded with HTMX -->
      <div style="margin-top: 2rem;">
        <h3>Related Products</h3>
        <div hx-get="/api/products/related/${product.id}" hx-trigger="load" hx-swap="innerHTML"></div>
      </div>
    </div>
  `, { headers: { "Content-Type": "text/html" } });
});

// Features fragment
app.get("/api/fragments/features", (ctx): void => {
  ctx.response = new Response(`
    <h2>HTMX Features</h2>
    <p>This demo showcases several HTMX features that enable rich interactivity without writing JavaScript:</p>

    <div class="card-grid" style="margin-top: 1.5rem;">
      <div class="card">
        <h3>Content Swapping</h3>
        <p>The navigation menu uses <code>hx-target</code> and <code>hx-get</code> to swap content in the main area.</p>
        <pre><code>hx-get="/api/fragments/home"
hx-target="#content"</code></pre>
      </div>

      <div class="card">
        <h3>Search with Debounce</h3>
        <p>The product search uses <code>hx-trigger</code> with a delay to prevent too many requests.</p>
        <pre><code>hx-trigger="keyup changed delay:500ms"</code></pre>
      </div>

      <div class="card">
        <h3>Loading Indicators</h3>
        <p>The content area shows a spinner while loading using <code>hx-indicator</code>.</p>
        <pre><code>hx-indicator="#spinner"</code></pre>
      </div>

      <div class="card">
        <h3>Lazy Loading</h3>
        <p>Related products are loaded only when needed using <code>hx-trigger="load"</code>.</p>
      </div>

      <div class="card">
        <h3>Form Submission</h3>
        <p>The Add to Cart button uses <code>hx-post</code> and <code>hx-vals</code> to submit data.</p>
      </div>

      <div class="card">
        <h3>Polling</h3>
        <p>The cart indicator updates every 2 seconds using <code>hx-trigger="load, every 2s"</code>.</p>
      </div>
    </div>

    <div style="margin-top: 2rem;">
      <h3>Try It Out</h3>
      <p>Click the buttons below to see HTMX in action:</p>

      <button class="btn"
        hx-post="/api/demo/click-counter"
        hx-target="#click-counter">Click Me</button>

      <div id="click-counter" style="margin-top: 1rem;">Click count: 0</div>
    </div>
  `, { headers: { "Content-Type": "text/html" } });
});

// API Formats fragment
app.get("/api/fragments/api-formats", (ctx): void => {
  ctx.response = new Response(`
    <h2>API Formats</h2>
    <p>Mix supports content negotiation, allowing the same endpoint to serve different formats based on the Accept header.</p>

    <div class="card-grid" style="margin-top: 1.5rem;">
      <div class="card">
        <h3>JSON Format</h3>
        <p>Standard JSON response format:</p>
        <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">${JSON.stringify({ data: products[0] }, null, 2)}</pre>
        <a href="/products/format/json" class="btn" target="_blank">View JSON Example</a>
      </div>

      <div class="card">
        <h3>HAL Format</h3>
        <p>Hypermedia Application Language format with _links:</p>
        <pre style="background: #f5f5f5; padding: 1rem; overflow: auto;">${JSON.stringify({
    ...products[0],
    _links: {
      self: { href: `/products/${products[0].id}` },
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
  `, { headers: { "Content-Type": "text/html" } });
});

// Error Demo fragment
app.get("/api/fragments/error-demo", (ctx): void => {
  ctx.response = new Response(`
    <h2>Error Handling</h2>
    <p>Mix provides consistent error handling with content negotiation support.</p>

    <div class="card" style="margin-top: 1.5rem;">
      <h3>Error Examples</h3>
      <p>Click the buttons below to see different error responses:</p>

      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        <button class="btn"
          hx-get="/error"
          hx-target="#error-result">Server Error</button>

        <button class="btn"
          hx-get="/products/999"
          hx-target="#error-result">Not Found Error</button>

        <button class="btn"
          hx-get="/api/demo/validation-error"
          hx-target="#error-result">Validation Error</button>
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
  `, { headers: { "Content-Type": "text/html" } });
});

// Click counter demo endpoint
app.post("/api/demo/click-counter", (ctx): void => {
  // Generate a random number between 1 and 100
  const count = Math.floor(Math.random() * 100) + 1;

  ctx.response = new Response(`Click count: ${count}`, {
    headers: { "Content-Type": "text/html" }
  });
});

// Validation error demo endpoint
app.get("/api/demo/validation-error", (ctx): void => {
  ctx.response = new Response(`
    <div style="padding: 1rem; background: #ffebee; border-left: 4px solid #f44336; color: #b71c1c;">
      <h3 style="margin-top: 0;">Validation Error</h3>
      <p>The following fields have validation errors:</p>
      <ul>
        <li>email: Must be a valid email address</li>
        <li>age: Must be at least 18</li>
        <li>password: Must be at least 8 characters</li>
      </ul>
    </div>
  `, { headers: { "Content-Type": "text/html" } });
});

// Error example with content negotiation
app.get("/error", (ctx): void => {
  // Error response format determined by Accept header
  handleError(ctx, 500, "Example error", {
    code: "EXAMPLE_ERROR",
    timestamp: new Date().toISOString()
  });
});

console.log("Workflow example running at http://localhost:3000");
console.log("Visit http://localhost:3000/ for the home page");
app.listen(3000);
