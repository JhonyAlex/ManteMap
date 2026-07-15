export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">ManteMap</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Plataforma de gestión documental, activos, vencimientos y planos interactivos.
        </p>
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Fase 0 — Arquitectura</h2>
          <p className="text-muted-foreground">
            La aplicación base está configurada. Consulta el{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">ROADMAP.md</code>{' '}
            para ver el progreso del desarrollo.
          </p>
        </div>
      </div>
    </main>
  );
}
