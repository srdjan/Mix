/** @jsx h */
import { h } from "nano";
import { FeatureCardProps } from "./types.ts";

export const FeatureCard = ({ title, description, code }: FeatureCardProps) => (
  <div class="card">
    <h3>{title}</h3>
    <p>{description}</p>
    {code && (
      <pre><code>{code}</code></pre>
    )}
  </div>
);
