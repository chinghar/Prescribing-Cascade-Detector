export function PrivacyNote() {
  return (
    <aside
      aria-label="Privacy statement"
      className="rounded-md border-2 border-border bg-surface-alt p-4 text-base text-ink-muted"
    >
      <p>
        <strong className="text-ink">Your privacy:</strong> nothing you type here is saved, stored
        in a database, or sent to anyone else. Your medication list only exists in your browser
        while this page is open, and disappears when you close or reload it.
      </p>
    </aside>
  );
}
