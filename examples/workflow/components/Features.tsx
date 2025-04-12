/** @jsx h */
import { h, Fragment } from "nano";
import { FeatureCard } from "./FeatureCard.tsx";

export const Features = () => (
  <Fragment>
    <h2>HTMX Features</h2>
    <p>This demo showcases several HTMX features that enable rich interactivity without writing JavaScript:</p>
    
    <div class="card-grid" style="margin-top: 1.5rem;">
      <FeatureCard 
        title="Content Swapping" 
        description="The navigation menu uses hx-target and hx-get to swap content in the main area."
        code={`hx-get="/api/fragments/home"\nhx-target="#content"`}
      />
      
      <FeatureCard 
        title="Search with Debounce" 
        description="The product search uses hx-trigger with a delay to prevent too many requests."
        code={`hx-trigger="keyup changed delay:500ms"`}
      />
      
      <FeatureCard 
        title="Loading Indicators" 
        description="The content area shows a spinner while loading using hx-indicator."
        code={`hx-indicator="#spinner"`}
      />
      
      <FeatureCard 
        title="Lazy Loading" 
        description="Related products are loaded only when needed using hx-trigger='load'."
      />
      
      <FeatureCard 
        title="Form Submission" 
        description="The Add to Cart button uses hx-post and hx-vals to submit data."
      />
      
      <FeatureCard 
        title="Polling" 
        description="The cart indicator updates every 2 seconds using hx-trigger='load, every 2s'."
      />
    </div>
    
    <div style="margin-top: 2rem;">
      <h3>Try It Out</h3>
      <p>Click the buttons below to see HTMX in action:</p>
      
      <button 
        type="button"
        class="btn"
        hx-post="/api/demo/click-counter"
        hx-target="#click-counter"
      >Click Me</button>
      
      <div id="click-counter" style="margin-top: 1rem;">Click count: 0</div>
    </div>
  </Fragment>
);
