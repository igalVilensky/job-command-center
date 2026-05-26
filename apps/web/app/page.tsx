const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  return (
    <main className="shell" data-api-url={apiUrl}>
      <section className="panel" aria-labelledby="page-title">
        <p className="eyebrow">Milestone 01</p>
        <h1 id="page-title">Job Command Center</h1>
        <p className="meta">API: {apiUrl}</p>
      </section>
    </main>
  );
}
