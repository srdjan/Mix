/** @jsx h */
import { h, Fragment } from "nano";
import { ProductListProps } from "./types.ts";
import { ProductCard } from "./ProductCard.tsx";

export const ProductList = ({ products }: ProductListProps) => (
  <Fragment>
    {/* Hidden spinner for HTMX indicators */}
    <div id="spinner" class="htmx-indicator">
      <div class="spinner"></div> Loading...
    </div>
    <h2>Product Catalog</h2>
    <p>Browse our product catalog with search and sorting capabilities.</p>

    {/* Search with HTMX */}
    <div class="margin-bottom-lg">
      <input
        type="text"
        class="search-input"
        placeholder="Search products..."
        hx-get="/api/products/search"
        hx-trigger="keyup changed delay:500ms"
        hx-target="#product-list"
        name="query"
      />

      {/* Sort options with HTMX */}
      <div class="flex flex-gap margin-bottom">
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
