/** @jsx h */
import { h } from "nano";
import { ProductDetailProps } from "./types.ts";

export const ProductDetail = ({ product }: ProductDetailProps) => (
  <div>
    <div style="margin-bottom: 1rem;">
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
    <div class="product-price" style="font-size: 1.5rem;">${product.price}</div>
    <div style="margin: 1rem 0;">{product.description}</div>
    
    {/* Quantity control with HTMX */}
    <div class="quantity-control" style="display: flex; align-items: center; margin: 1rem 0;">
      <button 
        type="button"
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
        type="button"
        style="background: #f5f5f5; border: 1px solid #ddd; padding: 0.5rem 1rem; cursor: pointer;"
        hx-get="/api/increment?value=1" 
        hx-target="#quantity" 
        hx-swap="outerHTML"
      >+</button>
    </div>
    
    {/* Add to cart button with HTMX */}
    <button 
      type="button"
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
