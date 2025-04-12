/** @jsx h */
import { h } from "nano";
import { ProductCardProps } from "./types.ts";

export const ProductCard = ({ product, onViewDetails = true }: ProductCardProps) => (
  <div class="product-card">
    <h3 class="product-name">{product.name}</h3>
    <div class="product-price">${product.price}</div>
    <p class="product-description">{product.description}</p>
    {onViewDetails && (
      <button 
        type="button"
        class="btn"
        hx-get={`/api/fragments/product-detail/${product.id}`}
        hx-target="#content"
      >
        View Details
      </button>
    )}
  </div>
);
