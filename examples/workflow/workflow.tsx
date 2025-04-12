/** @jsx h */
import { h, renderSSR } from "nano";
import { App } from "../../lib/server/mixon.ts";
import { Layout } from "../../lib/components/index.ts";
import {
  ApiFormats,
  ErrorDemo,
  Features,
  Home,
  ProductDetail,
  ProductList,
} from "./components/index.ts";

const app = App();
const { utils } = app;
const { MediaType, createResponse, handleError } = utils;

// Cart state
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const cart: CartItem[] = [];

// Sample data
const products = [
  {
    id: "1",
    name: "Laptop",
    price: 999.99,
    description: "Powerful laptop with 16GB RAM",
  },
  {
    id: "2",
    name: "Smartphone",
    price: 699.99,
    description: "Latest model with 5G support",
  },
  {
    id: "3",
    name: "Headphones",
    price: 199.99,
    description: "Noise-cancelling wireless headphones",
  },
];

// Root route - Home page with Nano JSX
app.get("/", (ctx): void => {
  const html = renderSSR(
    <Layout title="Mixon Framework Demo">
      <Home />
    </Layout>,
  );

  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// API Fragment endpoints for HTMX content swapping

// Home fragment
app.get("/api/fragments/home", (ctx): void => {
  const html = renderSSR(<Home />);
  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Products fragment
app.get("/api/fragments/products", (ctx): void => {
  const html = renderSSR(<ProductList products={products} />);
  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Product detail fragment
app.get<{ id: string }>("/api/fragments/product-detail/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    ctx.response = new Response("<div class='card'>Invalid product ID</div>", {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
    return;
  }

  const productId = ctx.validated.params.value.id;
  const product = products.find((p) => p.id === productId);

  if (!product) {
    ctx.response = new Response("<div class='card'>Product not found</div>", {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
    return;
  }

  const html = renderSSR(<ProductDetail product={product} />);
  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Features fragment
app.get("/api/fragments/features", (ctx): void => {
  const html = renderSSR(<Features />);
  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// API Formats fragment
app.get("/api/fragments/api-formats", (ctx): void => {
  const html = renderSSR(<ApiFormats product={products[0]} />);
  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Error Demo fragment
app.get("/api/fragments/error-demo", (ctx): void => {
  const html = renderSSR(<ErrorDemo />);
  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Get all products - demonstrates automatic content negotiation
app.get("/products", (ctx): void => {
  // Response format determined by Accept header
  ctx.response = createResponse(ctx, products, {
    links: {
      self: "/products",
    },
    meta: {
      count: products.length,
      version: "1.0",
    },
  });
});

// Get product by ID - demonstrates content negotiation with templates
app.get<{ id: string }>("/products/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    handleError(ctx, 400, "Invalid product ID", ctx.validated.params.error);
    return;
  }

  const productId = ctx.validated.params.value.id;
  const product = products.find((p) => p.id === productId);

  if (!product) {
    handleError(ctx, 404, "Product not found");
    return;
  }

  // For HTML responses, use Nano JSX
  if (ctx.preferredMediaType === MediaType.HTML) {
    const html = renderSSR(
      <Layout title={`${product.name} - Product Details`}>
        <ProductDetail product={product} />
      </Layout>,
    );

    ctx.response = new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
    return;
  }

  // For other formats, use createResponse
  ctx.response = createResponse(ctx, product, {
    links: {
      self: `/products/${product.id}`,
      collection: "/products",
    },
  });
});

// Force specific format regardless of Accept header
app.get("/products/format/json", (ctx): void => {
  ctx.response = createResponse(ctx, products, {
    mediaType: MediaType.JSON, // Force JSON format
    links: {
      self: "/products/format/json",
    },
  });
});

app.get("/products/format/hal", (ctx): void => {
  ctx.response = createResponse(ctx, products, {
    mediaType: MediaType.HAL, // Force HAL format
    links: {
      self: { href: "/products/format/hal" },
      collection: { href: "/products" },
    },
  });
});

app.get("/products/format/html", (ctx): void => {
  const html = renderSSR(
    <Layout title="Products Catalog">
      <ProductList products={products} />
    </Layout>,
  );

  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
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
    { headers: { "Content-Type": "text/html" } },
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
    { headers: { "Content-Type": "text/html" } },
  );
});

// Add to cart
app.post("/api/cart/add", async (ctx): Promise<void> => {
  try {
    // Get the data from the request
    const contentType = ctx.request.headers.get("Content-Type") || "";

    let productId = "";
    let name = "";
    let price = 0;
    let quantity = 1;

    if (contentType.includes("application/json")) {
      // Handle JSON data
      const body = await ctx.request.json();
      productId = body.productId;
      name = body.name;
      price = parseFloat(body.price);
      quantity = body.quantity ? parseInt(body.quantity, 10) : 1;
    } else if (contentType.includes("application/x-www-form-urlencoded") ||
               contentType.includes("multipart/form-data")) {
      // Handle form data
      const formData = await ctx.request.formData();
      productId = formData.get("productId") as string;
      name = formData.get("name") as string;
      price = parseFloat(formData.get("price") as string);
      quantity = formData.get("quantity") ? parseInt(formData.get("quantity") as string, 10) : 1;
    } else {
      // Handle URL encoded parameters
      const params = new URLSearchParams(await ctx.request.text());
      productId = params.get("productId") || "";
      name = params.get("name") || "";
      price = parseFloat(params.get("price") || "0");
      quantity = params.get("quantity") ? parseInt(params.get("quantity") || "1", 10) : 1;
    }

    // Check if product already exists in cart
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
      // Update quantity if product already in cart
      existingItem.quantity += quantity;
    } else {
      // Add new item to cart
      cart.push({
        id: productId,
        name,
        price,
        quantity
      });
    }

    ctx.response = new Response(
      `<div id="notification" class="cart-notification active">
        ${quantity} item(s) added to cart successfully!
        <button type="button" hx-get="/api/cart/hide-notification" hx-target="#notification" hx-swap="outerHTML" class="close-btn">×</button>
      </div>`,
      { headers: { "Content-Type": "text/html" } },
    );
  } catch (error) {
    handleError(ctx, 400, "Invalid request", error instanceof Error ? error.message : String(error));
  }
});

// Hide cart notification
app.get("/api/cart/hide-notification", (ctx): void => {
  ctx.response = new Response(
    `<div id="notification" class="cart-notification"></div>`,
    { headers: { "Content-Type": "text/html" } },
  );
});

// Get cart count
app.get("/api/cart/count", (ctx): void => {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  ctx.response = new Response(
    `${totalItems}`,
    { headers: { "Content-Type": "text/html" } },
  );
});

// View cart
app.get("/api/fragments/cart", (ctx): void => {
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);

  let html;

  if (totalItems === 0) {
    html = renderSSR(
      <div>
        {/* Hidden spinner for HTMX indicators */}
        <div id="spinner" class="htmx-indicator">
          <div class="spinner"></div> <span>Loading...</span>
        </div>
        <h2>Your Shopping Cart</h2>
        <p>Your cart is empty.</p>
        <button
          type="button"
          class="btn margin-top"
          hx-get="/api/fragments/products"
          hx-target="#content"
          hx-indicator="#spinner"
        >
          Continue Shopping
        </button>
      </div>
    );
  } else {
    html = renderSSR(
      <div>
        {/* Hidden spinner for HTMX indicators */}
        <div id="spinner" class="htmx-indicator">
          <div class="spinner"></div> <span>Loading...</span>
        </div>
        <h2>Your Shopping Cart</h2>
        <p>{totalItems} item(s) in your cart</p>

        <div class="margin-top margin-bottom">
          <table class="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th class="price">Price</th>
                <th class="quantity">Quantity</th>
                <th class="total">Total</th>
                <th class="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => (
                <tr>
                  <td>{item.name}</td>
                  <td class="price">${item.price.toFixed(2)}</td>
                  <td class="quantity">{item.quantity}</td>
                  <td class="total">${(item.price * item.quantity).toFixed(2)}</td>
                  <td class="actions">
                    <button
                      type="button"
                      class="btn-small"
                      hx-delete={`/api/cart/remove/${item.id}`}
                      hx-target="#content"
                      hx-swap="outerHTML"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr class="total-row">
                <td colspan="3" class="price">Total:</td>
                <td class="total">${totalPrice}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-gap">
          <button
            type="button"
            class="btn"
            hx-get="/api/fragments/products"
            hx-target="#content"
            hx-indicator="#spinner"
          >
            Continue Shopping
          </button>

          <button
            type="button"
            class="btn btn-secondary"
            hx-delete="/api/cart/clear"
            hx-target="#content"
            hx-swap="outerHTML"
          >
            Clear Cart
          </button>
        </div>
      </div>
    );
  }

  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Remove item from cart
app.delete<{ id: string }>("/api/cart/remove/:id", (ctx): void => {
  if (!ctx.validated.params.ok) {
    handleError(ctx, 400, "Invalid product ID", ctx.validated.params.error);
    return;
  }

  const productId = ctx.validated.params.value.id;
  const index = cart.findIndex(item => item.id === productId);

  if (index !== -1) {
    cart.splice(index, 1);
  }

  // Return the updated cart view directly
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);

  let html;

  if (totalItems === 0) {
    html = renderSSR(
      <div id="content" class="content-card">
        {/* Hidden spinner for HTMX indicators */}
        <div id="spinner" class="htmx-indicator">
          <div class="spinner"></div> <span>Loading...</span>
        </div>
        <h2>Your Shopping Cart</h2>
        <p>Your cart is empty.</p>
        <button
          type="button"
          class="btn margin-top"
          hx-get="/api/fragments/products"
          hx-target="#content"
          hx-indicator="#spinner"
        >
          Continue Shopping
        </button>
      </div>
    );
  } else {
    html = renderSSR(
      <div id="content" class="content-card">
        {/* Hidden spinner for HTMX indicators */}
        <div id="spinner" class="htmx-indicator">
          <div class="spinner"></div> <span>Loading...</span>
        </div>
        <h2>Your Shopping Cart</h2>
        <p>{totalItems} item(s) in your cart</p>

        <div class="margin-top margin-bottom">
          <table class="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th class="price">Price</th>
                <th class="quantity">Quantity</th>
                <th class="total">Total</th>
                <th class="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(item => (
                <tr>
                  <td>{item.name}</td>
                  <td class="price">${item.price.toFixed(2)}</td>
                  <td class="quantity">{item.quantity}</td>
                  <td class="total">${(item.price * item.quantity).toFixed(2)}</td>
                  <td class="actions">
                    <button
                      type="button"
                      class="btn-small"
                      hx-delete={`/api/cart/remove/${item.id}`}
                      hx-target="#content"
                      hx-swap="outerHTML"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr class="total-row">
                <td colspan="3" class="price">Total:</td>
                <td class="total">${totalPrice}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-gap">
          <button
            type="button"
            class="btn"
            hx-get="/api/fragments/products"
            hx-target="#content"
            hx-indicator="#spinner"
          >
            Continue Shopping
          </button>

          <button
            type="button"
            class="btn btn-secondary"
            hx-delete="/api/cart/clear"
            hx-target="#content"
            hx-swap="outerHTML"
          >
            Clear Cart
          </button>
        </div>
      </div>
    );
  }

  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Clear cart
app.delete("/api/cart/clear", (ctx): void => {
  cart.length = 0; // Clear the cart

  // Return the empty cart view directly
  const html = renderSSR(
    <div id="content" class="content-card">
      {/* Hidden spinner for HTMX indicators */}
      <div id="spinner" class="htmx-indicator">
        <div class="spinner"></div> <span>Loading...</span>
      </div>
      <h2>Your Shopping Cart</h2>
      <p>Your cart is empty.</p>
      <button
        type="button"
        class="btn margin-top"
        hx-get="/api/fragments/products"
        hx-target="#content"
        hx-indicator="#spinner"
      >
        Continue Shopping
      </button>
    </div>
  );

  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
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
    .filter((p) => p.id !== productId)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  ctx.response = new Response(
    `<ul>
      ${
      relatedProducts.map((p) => `
        <li>
          <a href="/products/${p.id}" hx-boost="true">${p.name} - $${p.price}</a>
        </li>
      `).join("")
    }
    </ul>`,
    { headers: { "Content-Type": "text/html" } },
  );
});

// Search products
app.get("/api/products/search", (ctx): void => {
  let query = "";
  if (ctx.validated.query.ok && ctx.validated.query.value.query) {
    query = ctx.validated.query.value.query.toLowerCase();
  }

  const filteredProducts = query
    ? products.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    )
    : products;

  // Use Nano JSX to render the product cards
  const html = renderSSR(
    <div class="product-grid">
      {filteredProducts.map((product) => (
        <div class="product-card">
          <h3 class="product-name">{product.name}</h3>
          <div class="product-price">${product.price}</div>
          <p class="product-description">{product.description}</p>
          <button
            type="button"
            class="btn"
            hx-get={`/api/fragments/product-detail/${product.id}`}
            hx-target="#content"
          >
            View Details
          </button>
        </div>
      ))}
    </div>,
  );

  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Sort products
app.get<{ method: string }>("/api/products/sort/:method", (ctx): void => {
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

  // Use Nano JSX to render the product cards
  const html = renderSSR(
    <div class="product-grid">
      {sortedProducts.map((product) => (
        <div class="product-card">
          <h3 class="product-name">{product.name}</h3>
          <div class="product-price">${product.price}</div>
          <p class="product-description">{product.description}</p>
          <button
            type="button"
            class="btn"
            hx-get={`/api/fragments/product-detail/${product.id}`}
            hx-target="#content"
          >
            View Details
          </button>
        </div>
      ))}
    </div>,
  );

  ctx.response = new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Click counter demo endpoint
app.post("/api/demo/click-counter", (ctx): void => {
  // Generate a random number between 1 and 100
  const count = Math.floor(Math.random() * 100) + 1;

  ctx.response = new Response(`Click count: ${count}`, {
    headers: { "Content-Type": "text/html" },
  });
});

// Validation error demo endpoint
app.get("/api/demo/validation-error", (ctx): void => {
  ctx.response = new Response(
    `
    <div style="padding: 1rem; background: #ffebee; border-left: 4px solid #f44336; color: #b71c1c;">
      <h3 style="margin-top: 0;">Validation Error</h3>
      <p>The following fields have validation errors:</p>
      <ul>
        <li>email: Must be a valid email address</li>
        <li>age: Must be at least 18</li>
        <li>password: Must be at least 8 characters</li>
      </ul>
    </div>
  `,
    { headers: { "Content-Type": "text/html" } },
  );
});

// Error example with content negotiation
app.get("/error", (ctx): void => {
  // Error response format determined by Accept header
  handleError(ctx, 500, "Example error", {
    code: "EXAMPLE_ERROR",
    timestamp: new Date().toISOString(),
  });
});

console.log("Workflow example running at http://localhost:3000");
console.log("Visit http://localhost:3000/ for the home page");
app.listen(3000);
