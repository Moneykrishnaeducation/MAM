"use client";

import { useEffect, useState } from "react";
import proxy from "@/lib/proxy";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkServer() {
      try {
        setLoading(true);
        const [healthRes, statusRes] = await Promise.all([
          proxy.get("/health"),
          proxy.get("/api/status"),
        ]);
        setHealthStatus(healthRes.data);
        setApiStatus(statusRes.data);
      } catch (err: any) {
        console.error("Proxy fetch error:", err);
        setError(err.message || "Failed to connect to backend server");
      } finally {
        setLoading(false);
      }
    }

    checkServer();
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status (via Proxy)</h2>
          {loading && <p className="text-sm text-gray-500">Connecting to server via proxy...</p>}
          {error && <p className="text-sm text-red-500">Error: {error}</p>}
          {!loading && !error && (
            <div className="space-y-2 font-mono text-xs">
              <div className="rounded bg-muted p-2">
                <strong>/health:</strong> {JSON.stringify(healthStatus)}
              </div>
              <div className="rounded bg-muted p-2">
                <strong>/api/status:</strong> {JSON.stringify(apiStatus)}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
