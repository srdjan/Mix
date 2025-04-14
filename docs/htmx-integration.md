# HTMX Integration

Mixon's content negotiation features work seamlessly with HTMX to create dynamic, interactive web applications with minimal JavaScript. This guide shows how to use HTMX with Mixon to build modern web interfaces.

## Overview

[HTMX](https://htmx.org/) allows you to access modern browser features directly from HTML, rather than using JavaScript. When combined with Mixon's content negotiation and HTML templating, you can build rich, interactive applications with server-side rendering.

## Getting Started

### 1. Include HTMX in your HTML template

```html
<script src="https://unpkg.com/htmx.org@2.0.4"></script>
```

### 2. Create API endpoints for HTMX interactions

```typescript
// Handle HTMX request
app.get("/api/increment", (ctx): void => {
  let currentValue = 1;
  if (ctx.validated.query.ok && ctx.validated.query.value.value) {
    currentValue = parseInt(ctx.validated.query.value.value, 10);
  }
  const newValue = Math.min(currentValue + 1, 10);
  
  // Return just the HTML fragment
  ctx.response = new Response(
    `<input type="number" id="quantity" value="${newValue}" min="1" max="10">`,
    { headers: { "Content-Type": "text/html" } }
  );
});
```

### 3. Add HTMX attributes to your HTML elements

```html
<!-- Button that triggers an HTMX request -->
<button 
  hx-post="/api/cart/add" 
  hx-vals='{"productId": "123"}' 
  hx-target="#notification" 
  hx-swap="outerHTML">
  Add to Cart
</button>

<!-- Element that will be updated with the response -->
<div id="notification"></div>
```

## Key HTMX Attributes

- `hx-get`, `hx-post`, `hx-put`, `hx-delete`: Specify the HTTP method and endpoint
- `hx-trigger`: When to trigger the request (e.g., "click", "change", "load")
- `hx-target`: Which element to update with the response
- `hx-swap`: How to swap the content (e.g., "innerHTML", "outerHTML")
- `hx-vals`: JSON values to include in the request

## Common Patterns

### 1. Loading Content on Page Load

```html
<div hx-get="/api/products/featured" hx-trigger="load" hx-swap="innerHTML"></div>
```

### 2. Form Submission without Page Refresh

```html
<form hx-post="/api/contact" hx-swap="outerHTML">
  <input type="text" name="name" placeholder="Name">
  <input type="email" name="email" placeholder="Email">
  <button type="submit">Send</button>
</form>
```

### 3. Search with Auto-Complete

```html
<input 
  type="text" 
  name="search" 
  placeholder="Search..." 
  hx-get="/api/search" 
  hx-trigger="keyup changed delay:500ms" 
  hx-target="#results">

<div id="results"></div>
```

### 4. Infinite Scroll

```html
<div class="posts">
  <!-- Posts content -->
  <div 
    hx-get="/api/posts?page=2" 
    hx-trigger="revealed" 
    hx-swap="afterend">
    Loading more...
  </div>
</div>
```

### 5. Tabs with Dynamic Content

```html
<div class="tabs">
  <button hx-get="/api/tab1" hx-target="#tab-content" class="active">Tab 1</button>
  <button hx-get="/api/tab2" hx-target="#tab-content">Tab 2</button>
  <button hx-get="/api/tab3" hx-target="#tab-content">Tab 3</button>
</div>

<div id="tab-content">
  <!-- Tab content will be loaded here -->
</div>
```

## Advanced Techniques

### 1. Boosting Regular Links

Add `hx-boost="true"` to links to make them use AJAX instead of full page loads:

```html
<a href="/products" hx-boost="true">View Products</a>
```

### 2. Progress Indicators

```html
<button hx-post="/api/slow-operation" hx-indicator="#spinner">
  Process
</button>
<div id="spinner" class="htmx-indicator">
  <img src="/spinner.gif">
</div>
```

### 3. Confirmation Dialogs

```html
<button 
  hx-delete="/api/product/123" 
  hx-confirm="Are you sure you want to delete this product?">
  Delete
</button>
```

### 4. WebSockets Integration

```html
<div hx-ws="connect:/api/chat">
  <div id="chat-messages"></div>
  
  <form hx-ws="send">
    <input name="message">
    <button type="submit">Send</button>
  </form>
</div>
```

## Example Application

See the complete example in `examples/content-negotiation.ts` which demonstrates:

- Product listing with search and sorting
- Product details with quantity controls
- Shopping cart interactions
- Dynamic loading of related products
- Form submission with HTMX

## Best Practices

1. **Return HTML Fragments**: API endpoints should return only the HTML needed, not full pages
2. **Use Content Negotiation**: Handle both HTMX requests and regular browser requests
3. **Progressive Enhancement**: Ensure basic functionality works without JavaScript
4. **Targeted Updates**: Update only the parts of the page that need to change
5. **Error Handling**: Return appropriate error responses that HTMX can display

## Conclusion

By combining Mixon's content negotiation with HTMX, you can build modern, interactive web applications with minimal JavaScript. This approach offers several benefits:

- **Simpler Development**: Less client-side JavaScript to write and maintain
- **Better Performance**: Smaller payload sizes and faster initial page loads
- **Progressive Enhancement**: Applications work even without JavaScript
- **SEO-Friendly**: Server-rendered content is easily indexable
- **Accessibility**: Better support for screen readers and assistive technologies

For more information, visit the [HTMX documentation](https://htmx.org/docs/).
