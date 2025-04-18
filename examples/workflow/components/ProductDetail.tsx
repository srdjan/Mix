/** @jsx h */
import { h } from "nano";
import { ProductDetailProps } from "./types.ts";

export const ProductDetail = ({ product }: ProductDetailProps) => (
  <div>
    {/* Hidden spinner for HTMX indicators */}
    <div id="spinner" class="htmx-indicator">
      <div class="spinner"></div> Loading...
    </div>
    <div class="margin-bottom">
      <button
        type="button"
        class="btn"
        hx-get="/api/fragments/products"
        hx-target="#content"
      >
        ← Back to Products
      </button>
    </div>

    <h2>{product.name}</h2>
    <div class="product-price product-price-lg">${product.price}</div>
    <div class="margin-bottom margin-top">{product.description}</div>

    {/* Add to cart form with HTMX */}
    <form
      hx-post="/api/cart/add"
      hx-target="#notification"
      hx-swap="outerHTML"
    >
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="name" value={product.name} />
      <input type="hidden" name="price" value={product.price} />

      {/* Quantity control */}
      <div class="quantity-control">
        <button
          type="button"
          class="quantity-btn"
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
          class="quantity-input"
        />
        <button
          type="button"
          class="quantity-btn"
          hx-get="/api/increment?value=1"
          hx-target="#quantity"
          hx-swap="outerHTML"
        >+</button>
      </div>

      <button
        type="submit"
        class="btn"
      >
        Add to Cart
      </button>
    </form>

    <div id="notification" class="margin-top"></div>

    {/* Related products loaded with HTMX */}
    <div class="margin-top-xl">
      <h3>Related Products</h3>
      <div hx-get={`/api/products/related/${product.id}`} hx-trigger="load" hx-swap="innerHTML"></div>
    </div>
  </div>
);
