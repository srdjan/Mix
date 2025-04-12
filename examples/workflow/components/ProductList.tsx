/** @jsx h */
import { h, Fragment } from "nano";
import { ProductListProps } from "./types.ts";
import { ProductCard } from "./ProductCard.tsx";

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
          type="button"
          class="btn"
          hx-get="/api/products/sort/name"
          hx-target="#product-list"
        >
          Sort by Name
        </button>
        <button 
          type="button"
          class="btn"
          hx-get="/api/products/sort/price-asc"
          hx-target="#product-list"
        >
          Price (Low to High)
        </button>
        <button 
          type="button"
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
