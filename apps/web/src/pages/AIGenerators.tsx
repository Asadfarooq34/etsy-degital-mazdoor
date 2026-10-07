import AIGenerator from "./AIGenerator";

export function TitleGenerator() {
  return (
    <AIGenerator
      kind="titles"
      title="Title Generator"
      subtitle="AI Etsy titles from real data"
      cardTitle="Generate 10 Etsy titles"
      description="Enter your focus keyword. Titles are 120-140 chars, start with your keyword, and use low-competition keywords from real search data — never invented metrics."
      placeholder="e.g. boho earrings"
      buttonText="Generate →"
      emptyText="No titles yet"
    />
  );
}

export function TagGenerator() {
  return (
    <AIGenerator
      kind="tags"
      title="Tag Generator"
      subtitle="AI Etsy tags from real data"
      cardTitle="Generate 13 Etsy tags"
      description="Enter your focus keyword. Tags are ≤20 chars, unique, and prioritise low-competition, high-intent phrases — including ones the top live listings actually use."
      placeholder="e.g. boho earrings"
      buttonText="Generate →"
      emptyText="No tags yet"
    />
  );
}

export function DescriptionGenerator() {
  return (
    <AIGenerator
      kind="descriptions"
      title="Description Generator"
      subtitle="AI Etsy descriptions from real data"
      cardTitle="Generate an Etsy description"
      description="Fill in your keyword and product details — you'll get 3 versions to choose from, grounded in real listing data."
      placeholder="e.g. wedding invitation template"
      buttonText="Generate 3 descriptions →"
      emptyText="No description yet"
      extraFields
    />
  );
}

export function EtsyListingPro() {
  return (
    <AIGenerator
      kind="listing"
      title="Etsy Listing Pro"
      subtitle="A whole listing + AI images in one click"
      cardTitle="Etsy Listing Pro"
      description="Describe your product and get a complete listing — one optimized title, 13 tags, a description, a price anchored to the real market median. The price is an AI suggestion, not a guarantee."
      placeholder="e.g. personalized birth flower sweatshirt…"
      buttonText="Generate Listing →"
      emptyText="Your full listing appears here"
      pink
    />
  );
}

export function AIListingHelper() {
  return (
    <AIGenerator
      kind="listing"
      title="AI Listing Helper"
      subtitle="AI title, tags & description"
      cardTitle="Describe your product"
      description="Grounded in real listing tags. One shot — title, tags and description together."
      placeholder="e.g. personalized birthstone necklace for mom"
      buttonText="Generate listing"
      emptyText="No listing yet"
      pink
    />
  );
}
