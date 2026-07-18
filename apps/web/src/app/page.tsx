import Link from "next/link";

const features = [
  { title: "Activos configurables", desc: "Tipos de ítem con campos dinámicos y estados personalizables." },
  { title: "Documentos con versionado", desc: "Subí, versioná y controlá vencimientos de documentación." },
  { title: "Calendario y eventos", desc: "Eventos con recurrencia, vencimientos y vista mensual/semanal." },
  { title: "Ubicaciones y planos", desc: "Jerarquía de ubicaciones, planos interactivos con marcadores y polígonos." },
  { title: "Alertas inteligentes", desc: "Notificaciones in-app, email, Slack, Teams y Telegram." },
  { title: "QR e inspecciones", desc: "Códigos QR por ítem, escaneo móvil, webhooks y exportación PDF." },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-3 text-5xl font-bold tracking-tight">ManteMap</h1>
        <p className="mb-10 text-lg text-muted-foreground">
          Plataforma de gestión documental, activos, vencimientos y planos interactivos.
        </p>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border bg-card p-5 text-left shadow-sm"
            >
              <h3 className="mb-1.5 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-md border px-6 text-sm font-medium hover:bg-accent"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
