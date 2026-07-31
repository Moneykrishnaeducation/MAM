import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-2">404 - Page Not Found</h1>
      <p className="text-gray-500 mb-6">Could not find the requested resource or endpoint.</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
