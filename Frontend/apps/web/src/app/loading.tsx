export default function Loading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 animate-pulse">
      <div className="h-28 w-full rounded bg-muted/60 mb-6" />
      <div className="rounded-lg border p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-muted/80" />
        <div className="h-12 w-full rounded bg-muted/40" />
        <div className="h-12 w-full rounded bg-muted/40" />
      </div>
    </div>
  );
}
