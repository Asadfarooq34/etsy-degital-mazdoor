import { Button, EmptyState } from "../components";

/** 404 page — the app uses state-based navigation, so this is the catch-all page. */
export default function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <EmptyState
      icon="🧭"
      title="Page not found"
      hint="The page you're looking for doesn't exist or was moved. Let's get you back to familiar ground."
      action={
        <Button onClick={onHome}>
          Back to Overview
        </Button>
      }
    />
  );
}
