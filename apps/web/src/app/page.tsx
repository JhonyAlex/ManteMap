export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">ManteMap</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Plataforma de gestión documental, activos, vencimientos y planos interactivos.
        </p>
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Fase 2 — Tipos, campos y estados</h2>
          <p className="text-muted-foreground">
            La Fase 1 está completa. El CRUD de tipos de ítem de la primera entrega de la Fase 2
            está implementado y desplegado. Los campos dinámicos y los estados configurables son
            los próximos pasos.
          </p>
        </div>
      </div>
    </main>
  );
}
