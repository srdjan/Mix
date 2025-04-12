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

// Error example with content negotiation
app.get("/error", (ctx): void => {
  // Error response format determined by Accept header
  handleError(ctx, 500, "Example error", {
    code: "EXAMPLE_ERROR",
    timestamp: new Date().toISOString()
  });
});

console.log("Content negotiation example running at http://localhost:3000");
app.listen(3000);
