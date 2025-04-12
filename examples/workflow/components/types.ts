// Common types for components

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export type ProductCardProps = {
  product: Product;
  onViewDetails?: boolean;
};

export type ProductListProps = {
  products: Product[];
};

export type ProductDetailProps = {
  product: Product;
};

export type FeatureCardProps = {
  title: string;
  description: string;
  code?: string;
};

export type ApiFormatsProps = {
  product: Product;
};
