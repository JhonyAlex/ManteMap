# PROMPT MAESTRO — PLATAFORMA DE GESTIÓN DOCUMENTAL, ACTIVOS, VENCIMIENTOS Y PLANOS

Actúa como arquitecto de software sénior, diseñador UX/UI, desarrollador full stack, especialista en bases de datos y responsable técnico del proyecto.

Tienes acceso completo a la carpeta actual, que será el repositorio principal de una nueva plataforma web.

Tu objetivo es diseñar, documentar e implementar progresivamente una aplicación moderna, modular, segura y autoalojable para gestionar proyectos, inventarios, activos, documentación, fechas periódicas, vencimientos, ubicaciones y planos interactivos.

No debes limitarte a crear una maqueta visual. Debes construir una base funcional, mantenible y preparada para evolucionar.

------

# 1. OBJETIVO GENERAL DEL SOFTWARE

La aplicación permitirá crear proyectos.

Cada proyecto podrá contener diferentes tipos de ítems o elementos.

Ejemplos de proyectos:

- Una planta industrial.
- Una empresa.
- Un edificio.
- Una instalación.
- Un almacén.
- Una comunidad.
- Un cliente.
- Un proyecto documental.
- Una infraestructura técnica.

Ejemplos de ítems:

- Máquinas.
- Equipos.
- Extintores.
- Instrumentos de medición.
- Servidores.
- Contratos.
- Certificados.
- Vehículos.
- Elementos de seguridad.
- Instalaciones.
- Herramientas.
- Documentos sujetos a renovación.

Cada ítem tendrá campos generales y campos variables definidos por el usuario.

La aplicación deberá centralizar:

- Inventario.
- Características técnicas.
- Documentación.
- Fotografías.
- Enlaces externos.
- Fechas relevantes.
- Vencimientos.
- Revisiones.
- Calibraciones.
- Mantenimientos.
- Estados.
- Ubicaciones.
- Historial.
- Responsables.
- Planos interactivos.
- Alertas.
- Calendario.

------

# 2. PRINCIPIOS DEL PROYECTO

Debes seguir estos principios durante todo el desarrollo:

1. No crear archivos excesivamente largos.
2. No mezclar lógica de negocio, interfaz y acceso a datos.
3. No construir una arquitectura innecesariamente compleja.
4. No introducir dependencias sin justificar su utilidad.
5. No duplicar lógica.
6. No dejar código provisional sin identificar.
7. No simular funcionalidades como terminadas si todavía usan datos falsos.
8. No modificar partes estables sin necesidad.
9. No borrar datos, migraciones o configuraciones sin autorización explícita.
10. No almacenar secretos en el repositorio.
11. No hacer cambios destructivos en producción.
12. No avanzar a una fase nueva si la anterior no está validada.
13. Mantener siempre actualizado el estado real del proyecto.
14. Priorizar mantenibilidad, claridad y facilidad de despliegue.
15. Construir primero el núcleo funcional y después las funciones avanzadas.

------

# 3. TECNOLOGÍA RECOMENDADA

Evalúa el entorno antes de comenzar.

Salvo que exista una razón técnica documentada para cambiarlo, utiliza esta arquitectura:

## Monorepositorio

- pnpm workspaces.
- Turborepo si aporta valor real.
- TypeScript en todo el proyecto.

## Frontend

- React.
- Next.js estable.
- Tailwind CSS.
- Componentes accesibles basados en shadcn/ui o Radix UI.
- TanStack Query para estado remoto.
- React Hook Form.
- Zod para validación.
- FullCalendar para calendarios.
- Konva.js o React Konva para planos interactivos.

## Backend

Utiliza una de estas alternativas, escogiendo la más sencilla y mantenible:

### Alternativa preferente

Next.js como aplicación full stack, con una capa de servicios y repositorios bien separada.

### Alternativa separada

- Frontend Next.js.
- API NestJS.

Usa una API separada únicamente si existen razones claras para ello. No añadas complejidad por anticipación.

## Base de datos

- PostgreSQL.
- Prisma ORM o Drizzle ORM.
- Migraciones versionadas.
- Uso controlado de JSONB para campos dinámicos.

## Autenticación

- Autenticación segura mediante sesiones.
- Usuarios.
- Roles.
- Permisos por proyecto.
- Preparado para añadir OAuth en el futuro.

## Archivos

Crear una abstracción de almacenamiento compatible con:

- Disco local durante desarrollo.
- S3.
- MinIO.
- Cloudflare R2.

No acoplar la lógica del sistema a un único proveedor.

## Despliegue

- Docker.
- Docker Compose.
- Compatible con Dokploy.
- Variables de entorno documentadas.
- Healthchecks.
- Volúmenes claramente definidos.
- PostgreSQL independiente.
- Estrategia de backup documentada.

------

# 4. ESTRUCTURA INICIAL DEL REPOSITORIO

Propón y crea una estructura similar a:

```text
/
├── apps/
│   └── web/
├── packages/
│   ├── database/
│   ├── ui/
│   ├── validation/
│   ├── config/
│   └── shared/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── functional/
│   ├── deployment/
│   ├── testing/
│   └── progress/
├── scripts/
├── docker/
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── package.json
```

La estructura puede adaptarse, pero cualquier cambio debe justificarse.

------

# 5. AGENTS.md OBLIGATORIO

Antes de comenzar la implementación funcional, crea un archivo `AGENTS.md` en la raíz.

Este archivo será la guía principal para todas las IAs que trabajen posteriormente en el repositorio.

Debe mantenerse actualizado después de cada intervención relevante.

El archivo debe contener como mínimo:

## 5.1 Propósito del proyecto

- Qué problema resuelve.
- Para quién está pensado.
- Qué funciones principales tendrá.
- Qué no pretende resolver todavía.

## 5.2 Arquitectura

- Tecnologías utilizadas.
- Estructura del repositorio.
- Relación entre módulos.
- Flujo general de datos.
- Convenciones importantes.

## 5.3 Reglas de trabajo

- Leer `AGENTS.md` antes de modificar código.
- Revisar Git antes de comenzar.
- No trabajar directamente sobre cambios desconocidos.
- No borrar código ajeno sin entenderlo.
- No usar comandos destructivos.
- No alterar migraciones aplicadas.
- Crear migraciones nuevas.
- No introducir secretos.
- Mantener tipado estricto.
- Ejecutar validaciones antes de finalizar.
- Registrar las decisiones técnicas.
- Mantener actualizada la documentación de progreso.

## 5.4 Convenciones de código

- Nombres.
- Organización de archivos.
- Gestión de errores.
- Validaciones.
- Tipos.
- Servicios.
- Repositorios.
- Componentes.
- Formularios.
- Pruebas.
- Logs.

## 5.5 Límites de tamaño

Usar como referencia:

- Componentes UI: preferiblemente menos de 200 líneas.
- Servicios: preferiblemente menos de 250 líneas.
- Rutas o controladores: preferiblemente menos de 200 líneas.
- Archivos generales: evitar superar 300 líneas.

Si un archivo crece demasiado, debe dividirse por responsabilidad.

No dividir artificialmente archivos pequeños solamente para cumplir un número.

## 5.6 Estado actual

Incluir siempre:

- Fase actual.
- Funciones terminadas.
- Funciones parcialmente terminadas.
- Funciones pendientes.
- Bloqueos.
- Deuda técnica conocida.
- Últimas validaciones realizadas.
- Próximo paso recomendado.

## 5.7 Cómo continuar

Incluir instrucciones concretas para la siguiente IA:

- Qué debe leer.
- Qué debe verificar.
- Qué no debe tocar.
- Qué tarea debería continuar.
- Cómo validar el trabajo.

## 5.8 Historial resumido

Mantener una tabla como:

```text
| Fecha | Agente | Trabajo realizado | Estado | Próximo paso |
```

No convertir `AGENTS.md` en un diario interminable.

Los detalles extensos deben ir en `docs/progress/`.

------

# 6. DOCUMENTACIÓN DE CONTINUIDAD

Además de `AGENTS.md`, crea:

## `ROADMAP.md`

Debe mostrar:

- Fases.
- Objetivos.
- Entregables.
- Dependencias.
- Estado.
- Criterios de aceptación.

## `CHANGELOG.md`

Registrar cambios funcionales relevantes.

## `docs/progress/CURRENT_STATUS.md`

Debe contener:

- Qué funciona realmente.
- Qué está simulado.
- Qué está incompleto.
- Qué errores existen.
- Cómo levantar el entorno.
- Qué comando ejecutar para validar.
- Última migración.
- Último commit estable.
- Próxima tarea concreta.

## `docs/decisions/`

Usar ADR para decisiones importantes:

```text
ADR-001-eleccion-arquitectura.md
ADR-002-campos-dinamicos.md
ADR-003-almacenamiento-documentos.md
ADR-004-planos-y-coordenadas.md
```

Cada decisión debe explicar:

- Contexto.
- Opciones consideradas.
- Decisión.
- Motivo.
- Consecuencias.

------

# 7. MODELO FUNCIONAL

## 7.1 Usuario

Campos básicos:

- ID.
- Nombre.
- Correo.
- Contraseña cifrada o proveedor de autenticación.
- Estado.
- Rol global.
- Fecha de creación.

## 7.2 Proyecto

Campos:

- ID.
- Código.
- Nombre.
- Descripción.
- Estado.
- Responsable.
- Imagen o logotipo.
- Fecha de creación.
- Fecha de actualización.
- Configuración.
- Usuarios autorizados.

## 7.3 Tipo de ítem

El usuario podrá crear diferentes tipos de ítems.

Ejemplos:

- Máquina.
- Extintor.
- Calibrador.
- Servidor.
- Contrato.
- Documento.
- Vehículo.

Campos:

- Nombre.
- Descripción.
- Icono.
- Color visual opcional.
- Estado.
- Proyecto o alcance global.
- Plantilla de campos.
- Configuración de código automático.

## 7.4 Definición de campo dinámico

Cada tipo de ítem podrá definir sus campos.

Tipos iniciales:

- Texto corto.
- Texto largo.
- Número.
- Decimal.
- Moneda.
- Booleano.
- Fecha.
- Fecha y hora.
- Selección.
- Selección múltiple.
- URL.
- Correo.
- Teléfono.
- Archivo.
- Imagen.
- Relación con otro ítem.
- Relación con una ubicación.
- Usuario responsable.

Cada campo podrá configurar:

- Nombre.
- Clave interna.
- Tipo.
- Descripción.
- Obligatorio.
- Valor predeterminado.
- Orden.
- Visible.
- Activo.
- Opciones.
- Unidad.
- Reglas de validación.
- Visibilidad en listas.
- Visibilidad en búsquedas.
- Ayuda contextual.

Los campos dinámicos deben diseñarse de manera controlada.

Usar una combinación razonable de:

- Tabla para definiciones.
- JSONB para valores.
- Validación mediante esquemas.
- Índices para datos consultados frecuentemente.

Documentar claramente esta decisión.

## 7.5 Ítem o activo

Campos comunes:

- ID.
- Código único.
- Nombre.
- Proyecto.
- Tipo.
- Descripción.
- Estado.
- Activo o inactivo.
- Responsable.
- Ubicación.
- Fecha de instalación.
- Fecha de alta.
- Fabricante.
- Modelo.
- Número de serie.
- Etiquetas.
- Datos dinámicos.
- Imagen principal.
- Fecha de creación.
- Fecha de actualización.
- Usuario creador.

No todos los campos técnicos deben ser obligatorios.

## 7.6 Estados configurables

Cada proyecto o tipo de ítem podrá crear estados.

Ejemplos:

- Activo.
- Inactivo.
- Pendiente.
- En revisión.
- Fuera de servicio.
- Vencido.
- Dado de baja.

Cada estado podrá tener:

- Nombre.
- Código.
- Descripción.
- Color.
- Icono.
- Orden.
- Activo o inactivo.
- Estado inicial.
- Estado final.
- Indicación de bloqueo.
- Indicación de incidencia.

## 7.7 Documentos

Cada ítem podrá incluir múltiples documentos.

Campos:

- Nombre.
- Tipo documental.
- Archivo.
- URL alternativa.
- Descripción.
- Fecha del documento.
- Fecha de emisión.
- Fecha de vencimiento.
- Versión.
- Emisor.
- Estado.
- Documento principal.
- Etiquetas.
- Usuario que lo adjuntó.
- Fecha de creación.

Conservar historial y metadatos.

No sobrescribir documentos silenciosamente.

## 7.8 Eventos y fechas

No almacenar todas las revisiones como simples columnas dentro del ítem.

Crear una entidad independiente para eventos.

Ejemplos:

- Instalación.
- Inspección.
- Revisión.
- Calibración.
- Mantenimiento.
- Renovación.
- Caducidad.
- Garantía.
- Sustitución.
- Formación.
- Certificación.

Campos:

- Ítem.
- Proyecto.
- Tipo de evento.
- Título.
- Descripción.
- Fecha inicial.
- Fecha límite.
- Fecha de finalización.
- Todo el día o con hora.
- Responsable.
- Estado.
- Prioridad.
- Documento asociado.
- Observaciones.
- Requiere evidencia.
- Resultado.

## 7.9 Recurrencia

Permitir recurrencias como:

- No periódica.
- Diaria.
- Semanal.
- Mensual.
- Trimestral.
- Semestral.
- Anual.
- Cada determinada cantidad de días.
- Cada determinada cantidad de semanas.
- Cada determinada cantidad de meses.
- Regla personalizada.

No crear eventos infinitos anticipadamente.

Guardar la regla de recurrencia y generar instancias de forma controlada.

Registrar:

- Fecha base.
- Frecuencia.
- Intervalo.
- Próxima fecha.
- Fecha final opcional.
- Número máximo de ocurrencias.
- Días de aviso.
- Zona horaria.
- Política si cae en festivo o fin de semana.

## 7.10 Alertas

Permitir alertas por:

- Próximo vencimiento.
- Documento vencido.
- Calibración pendiente.
- Mantenimiento pendiente.
- Evento atrasado.
- Documento faltante.
- Ítem fuera de servicio.

Canales iniciales:

- Notificación dentro de la aplicación.
- Correo electrónico.

Preparar una arquitectura ampliable para:

- Microsoft Teams.
- Slack.
- Telegram.
- WhatsApp.
- Webhooks.

## 7.11 Ubicaciones

Crear estructura jerárquica:

```text
Centro
└── Edificio
    └── Planta
        └── Área
            └── Subárea
```

Campos:

- Nombre.
- Código.
- Tipo.
- Ubicación padre.
- Proyecto.
- Descripción.
- Responsable.
- Estado.
- Plano asociado.
- Orden.

Debe ser posible mover un ítem entre ubicaciones y conservar historial.

## 7.12 Historial

Registrar eventos importantes:

- Creación.
- Modificación.
- Cambio de estado.
- Cambio de responsable.
- Cambio de ubicación.
- Documento añadido.
- Documento reemplazado.
- Evento completado.
- Evento vencido.
- Modificación de fechas.
- Modificación del plano.

No es necesario registrar cada renderizado o acción irrelevante.

------

# 8. PLANOS INTERACTIVOS

Esta es una función central del sistema.

## 8.1 Gestión de planos

Permitir:

- Crear un plano.
- Asignarlo a un proyecto.
- Asignarlo a una planta o área.
- Subir imagen PNG, JPG, WEBP o SVG.
- Preparar soporte futuro para PDF.
- Definir nombre y descripción.
- Crear versiones.
- Activar o archivar versiones.

## 8.2 Posicionamiento de ítems

Permitir:

- Visualizar el plano.
- Arrastrar ítems al plano.
- Mover ítems.
- Eliminar la posición sin eliminar el ítem.
- Abrir la ficha desde el marcador.
- Mostrar nombre, código y estado.
- Cambiar icono según tipo.
- Cambiar indicador según estado.
- Agrupar marcadores si existe alta densidad.

Guardar coordenadas normalizadas:

```text
x entre 0 y 1
y entre 0 y 1
```

No guardar únicamente píxeles absolutos.

Esto permitirá adaptar los marcadores a diferentes resoluciones.

## 8.3 Zonas

En una fase posterior permitir:

- Dibujar rectángulos.
- Dibujar polígonos.
- Nombrar áreas.
- Asociar zonas con ubicaciones.
- Seleccionar una zona para filtrar ítems.
- Cambiar color y transparencia.

## 8.4 Capas

Preparar soporte para capas:

- Seguridad.
- Electricidad.
- Maquinaria.
- Extintores.
- Redes.
- Sensores.
- Mantenimiento.
- Elementos vencidos.

## 8.5 Modo edición

El plano debe diferenciar claramente:

- Modo visualización.
- Modo edición.

No permitir mover activos accidentalmente.

------

# 9. VISTAS PRINCIPALES

## Panel general

Mostrar:

- Ítems activos.
- Ítems inactivos.
- Eventos próximos.
- Eventos vencidos.
- Documentos por vencer.
- Calibraciones pendientes.
- Mantenimientos pendientes.
- Ítems sin documentación.
- Ítems sin ubicación.
- Actividad reciente.

## Vista de lista

Debe permitir:

- Buscar.
- Filtrar.
- Ordenar.
- Paginar.
- Seleccionar columnas.
- Filtrar por proyecto.
- Filtrar por tipo.
- Filtrar por estado.
- Filtrar por ubicación.
- Filtrar por responsable.
- Filtrar por vencimiento.
- Exportar.

## Vista calendario

Mostrar:

- Eventos.
- Revisiones.
- Calibraciones.
- Renovaciones.
- Vencimientos.
- Mantenimientos.

Permitir:

- Día.
- Semana.
- Mes.
- Filtros.
- Colores por tipo o estado.
- Acceso al ítem.
- Edición controlada.

## Vista plano

Permitir:

- Seleccionar proyecto.
- Seleccionar edificio.
- Seleccionar planta.
- Seleccionar plano.
- Filtrar ítems.
- Ver leyenda.
- Abrir ficha.
- Entrar en modo edición.

## Vista Kanban

Agrupar por:

- Estado.
- Responsable.
- Prioridad.
- Tipo de evento.

Esta vista puede implementarse después del MVP.

## Ficha del ítem

Debe mostrar pestañas o secciones para:

- Resumen.
- Características.
- Campos personalizados.
- Documentos.
- Eventos.
- Historial.
- Ubicación.
- Plano.
- Relaciones.
- Fotografías.

------

# 10. EXPERIENCIA DE USUARIO

La interfaz debe ser:

- Profesional.
- Clara.
- Moderna.
- Responsive.
- Utilizable en PC, tablet y móvil.
- Accesible.
- Rápida.
- Coherente.
- Sin saturación visual.

Debe incluir:

- Navegación lateral.
- Migas de pan.
- Estados de carga.
- Estados vacíos.
- Confirmaciones.
- Errores comprensibles.
- Formularios claros.
- Ayuda contextual.
- Búsqueda global futura.
- Modo claro y oscuro opcional.

No usar animaciones innecesarias.

No ocultar acciones importantes detrás de interfaces confusas.

------

# 11. SEGURIDAD Y PERMISOS

Implementar progresivamente:

## Roles iniciales

- Administrador.
- Gestor de proyecto.
- Técnico.
- Consulta.

## Permisos

Controlar:

- Ver proyectos.
- Crear proyectos.
- Editar proyectos.
- Crear ítems.
- Editar ítems.
- Eliminar ítems.
- Gestionar documentos.
- Gestionar planos.
- Mover activos.
- Gestionar estados.
- Gestionar campos dinámicos.
- Gestionar usuarios.
- Exportar datos.

Aplicar permisos también en el servidor.

No confiar únicamente en ocultar botones en el frontend.

------

# 12. AUDITORÍA Y TRAZABILIDAD

Registrar:

- Usuario.
- Fecha.
- Acción.
- Entidad.
- Entidad afectada.
- Valores relevantes anteriores.
- Valores relevantes posteriores.

Evitar almacenar información sensible innecesaria.

Crear una estrategia de auditoría que no haga crecer la base de datos sin control.

------

# 13. IMPORTACIÓN Y EXPORTACIÓN

Preparar:

- Importación CSV.
- Plantillas de importación.
- Validación previa.
- Vista de errores.
- Importación transaccional cuando sea posible.
- Exportación CSV.
- Exportación Excel futura.
- Exportación PDF futura.

La importación no debe crear silenciosamente registros inconsistentes.

------

# 14. CÓDIGOS QR

Preparar cada ítem para disponer de:

- Código único.
- URL pública o autenticada.
- Código QR imprimible.

Al escanearlo se podrá:

- Ver la ficha.
- Registrar inspección.
- Añadir fotografía.
- Completar evento.
- Reportar incidencia.

La implementación móvil avanzada puede quedar para una fase posterior.

------

# 15. API E INTEGRACIONES

Diseñar una API limpia para futuras integraciones.

Casos futuros:

- ERPNext.
- Activepieces.
- n8n.
- Kommo.
- Teams.
- Slack.
- Correo.
- WhatsApp.
- Power BI.
- Sensores.
- Sistemas externos de mantenimiento.

Crear webhooks solamente cuando exista una necesidad real.

No construir un sistema de integraciones completo durante el MVP.

------

# 16. PRUEBAS

Configurar desde el inicio:

- Lint.
- Formato.
- Typecheck.
- Pruebas unitarias.
- Pruebas de integración.
- Pruebas end-to-end para flujos críticos.

Flujos críticos:

1. Crear proyecto.
2. Crear tipo de ítem.
3. Definir campos personalizados.
4. Crear ítem.
5. Adjuntar documento.
6. Crear evento.
7. Configurar recurrencia.
8. Mostrar evento en calendario.
9. Crear ubicación.
10. Subir plano.
11. Posicionar ítem.
12. Abrir ítem desde el plano.
13. Cambiar estado.
14. Ver historial.
15. Validar permisos.

No buscar un porcentaje artificial de cobertura.

Priorizar lógica de negocio y flujos críticos.

------

# 17. OBSERVABILIDAD

Configurar:

- Logs estructurados.
- Identificador de petición.
- Registro de errores.
- Healthcheck.
- Estado de base de datos.
- Estado de almacenamiento.
- Manejo centralizado de errores.

Preparar integración futura con Sentry u otra plataforma.

No registrar contraseñas, tokens ni documentos sensibles.

------

# 18. BACKUPS Y RECUPERACIÓN

Documentar:

- Backup de PostgreSQL.
- Backup de archivos.
- Restauración.
- Frecuencia recomendada.
- Retención.
- Prueba de restauración.
- Volúmenes Docker.
- Datos que no deben perderse.

Una copia no se considera válida si nunca se ha probado su restauración.

------

# 19. FASES DE DESARROLLO

No implementar todo a la vez.

## Fase 0 — Descubrimiento y arquitectura

Entregables:

- Análisis del proyecto.
- Arquitectura.
- Modelo de datos inicial.
- ADR principales.
- Estructura del repositorio.
- `AGENTS.md`.
- `ROADMAP.md`.
- Entorno Docker.
- Base de datos conectada.
- Aplicación mínima ejecutándose.

Criterio de cierre:

- El proyecto levanta correctamente.
- La base de datos responde.
- Lint, typecheck y pruebas básicas funcionan.
- La documentación explica cómo continuar.

## Fase 1 — Usuarios y proyectos

Implementar:

- Autenticación.
- Usuarios.
- Roles básicos.
- Proyectos.
- Acceso por proyecto.
- Layout principal.

## Fase 2 — Tipos, campos y estados

Implementar:

- Tipos de ítem.
- Definición de campos dinámicos.
- Estados configurables.
- Formularios generados.
- Validación.

## Fase 3 — Ítems

Implementar:

- CRUD de ítems.
- Ficha.
- Listado.
- Filtros.
- Búsqueda.
- Historial básico.

## Fase 4 — Documentos

Implementar:

- Subida.
- Descarga.
- URLs.
- Metadatos.
- Vencimiento.
- Versiones iniciales.

## Fase 5 — Eventos y calendario

Implementar:

- Eventos.
- Fechas.
- Recurrencia.
- Próximas fechas.
- Calendario.
- Alertas internas.

## Fase 6 — Ubicaciones

Implementar:

- Jerarquía de ubicaciones.
- Movimiento de ítems.
- Historial de ubicación.

## Fase 7 — Planos

Implementar:

- Subida de plano.
- Visualización.
- Marcadores.
- Coordenadas normalizadas.
- Modo edición.
- Filtros.
- Acceso a ficha.

## Fase 8 — Panel e informes

Implementar:

- Indicadores.
- Próximos vencimientos.
- Documentación pendiente.
- Exportación inicial.

## Fase 9 — Funciones avanzadas

Evaluar:

- QR.
- Inspecciones móviles.
- Webhooks.
- Notificaciones externas.
- Polígonos.
- Capas.
- PDF.
- Firma.
- IA documental.
- OCR.
- Extracción automática de fechas.

------

# 20. MVP RECOMENDADO

El MVP no debe incluir todo.

Debe permitir como mínimo:

1. Iniciar sesión.
2. Crear proyecto.
3. Crear tipo de ítem.
4. Crear campos personalizados.
5. Crear estados.
6. Crear ítem.
7. Adjuntar documento o URL.
8. Crear fecha o evento.
9. Configurar recurrencia.
10. Ver próximos eventos.
11. Ver calendario.
12. Crear ubicación.
13. Subir plano.
14. Colocar un ítem en el plano.
15. Abrir la ficha desde el plano.
16. Consultar historial básico.

No añadir todavía:

- Facturación.
- Contabilidad.
- CRM.
- Chat.
- Automatizaciones complejas.
- Aplicación móvil nativa.
- Integraciones externas múltiples.
- BIM.
- GIS avanzado.
- OCR avanzado.

------

# 21. REGLAS DE IMPLEMENTACIÓN

Antes de modificar código:

1. Lee `AGENTS.md`.
2. Lee `README.md`.
3. Lee `CURRENT_STATUS.md`.
4. Revisa `ROADMAP.md`.
5. Revisa Git.
6. Comprueba cambios sin commit.
7. Identifica la fase activa.
8. Verifica dependencias.
9. Explica brevemente qué vas a realizar.

Durante el trabajo:

1. Trabaja en cambios pequeños.
2. Mantén separadas las responsabilidades.
3. Añade validación de servidor.
4. Añade migraciones.
5. Añade pruebas relevantes.
6. Evita datos simulados permanentes.
7. No ocultes errores.
8. No uses `any` salvo justificación.
9. No ignores errores TypeScript.
10. No desactives reglas para hacer pasar validaciones.
11. No dejes secretos.
12. No uses valores de producción en desarrollo.
13. No asumas que una función está terminada solo porque compila.

Al finalizar:

1. Ejecuta lint.
2. Ejecuta typecheck.
3. Ejecuta pruebas.
4. Ejecuta build.
5. Verifica migraciones.
6. Comprueba Docker si aplica.
7. Resume cambios.
8. Indica archivos relevantes.
9. Indica riesgos.
10. Indica lo que falta.
11. Actualiza `AGENTS.md`.
12. Actualiza `CURRENT_STATUS.md`.
13. Actualiza `ROADMAP.md`.
14. Actualiza `CHANGELOG.md` si corresponde.
15. Deja un siguiente paso concreto.

------

# 22. PROTOCOLO DE ESTADO

Cada intervención importante debe finalizar con este formato:

```text
## Resultado

### Completado
- ...

### Parcial
- ...

### Pendiente
- ...

### Validaciones
- Lint:
- Typecheck:
- Tests:
- Build:
- Docker:
- Migraciones:

### Riesgos o bloqueos
- ...

### Próximo paso recomendado
- ...

### Archivos principales modificados
- ...
```

No declarar como completado algo no validado.

------

# 23. GESTIÓN DE GIT

Aplicar estas reglas:

- No hacer `git reset --hard`.
- No hacer `git clean -fd`.
- No forzar push.
- No reescribir historial sin autorización.
- No mezclar múltiples fases en un solo commit.
- Usar mensajes de commit claros.
- Revisar `git diff`.
- Revisar archivos no rastreados.
- No incluir `.env`.
- No incluir archivos generados innecesarios.
- No incluir documentos o backups reales.
- Crear checkpoints al finalizar fases estables.

Formato recomendado:

```text
feat(items): add configurable item types
fix(calendar): correct recurring event calculation
docs(agents): update current implementation state
chore(docker): add development healthchecks
test(events): cover annual recurrence rules
```

------

# 24. DATOS Y MIGRACIONES

- No editar migraciones ya aplicadas.
- Crear nuevas migraciones.
- No eliminar columnas con datos sin estrategia.
- Documentar cambios destructivos.
- Crear datos de demostración separados.
- No mezclar seed de desarrollo con producción.
- Añadir índices según consultas reales.
- Evitar guardar todo indiscriminadamente en JSONB.
- Evitar esquemas rígidos que impidan campos configurables.
- Proteger integridad referencial.

------

# 25. DISEÑO DE CAMPOS DINÁMICOS

Antes de implementar, crea un ADR específico comparando:

## Opción A

Modelo Entity-Attribute-Value.

## Opción B

Valores en JSONB.

## Opción C

Tablas dinámicas.

## Opción D

Modelo híbrido.

La opción recomendada inicialmente es un modelo híbrido:

- Definiciones normalizadas.
- Valores dinámicos en JSONB.
- Campos comunes como columnas reales.
- Índices específicos para campos frecuentemente consultados.
- Validación mediante Zod o JSON Schema.

No implementar sin documentar la decisión.

------

# 26. DISEÑO DE RECURRENCIAS

Evitar errores habituales:

- No sumar siempre 30 días para representar meses.
- No sumar 365 días para representar años.
- Respetar meses y años naturales.
- Definir comportamiento para el día 29, 30 y 31.
- Considerar años bisiestos.
- Guardar zona horaria.
- Evitar duplicar ocurrencias.
- Permitir completar una ocurrencia sin destruir la regla.
- Permitir modificar solo una ocurrencia o toda la serie en el futuro.

Crear pruebas específicas.

------

# 27. DISEÑO DE PLANOS

Las posiciones deben guardar:

- Plano.
- Ítem.
- Coordenada X normalizada.
- Coordenada Y normalizada.
- Rotación opcional.
- Escala opcional.
- Icono.
- Capa.
- Fecha de posicionamiento.
- Usuario.

El frontend debe:

- Adaptarse al tamaño disponible.
- Conservar proporciones.
- Traducir coordenadas normalizadas a píxeles.
- Evitar guardar una posición durante un simple clic.
- Confirmar movimientos relevantes.
- Permitir cancelar cambios.
- Evitar pérdida de posiciones al cambiar el tamaño del plano.

Crear pruebas para la conversión de coordenadas.

------

# 28. CONFIGURACIÓN Y VARIABLES DE ENTORNO

Crear `.env.example` con variables documentadas.

Ejemplos:

```env
DATABASE_URL=
AUTH_SECRET=
APP_URL=
STORAGE_DRIVER=
STORAGE_LOCAL_PATH=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

No incluir valores sensibles reales.

Validar variables al iniciar la aplicación.

------

# 29. DATOS DE DEMOSTRACIÓN

Crear un seed opcional con:

- Un usuario administrador.
- Un proyecto de demostración.
- Varias ubicaciones.
- Dos tipos de ítem.
- Campos dinámicos.
- Algunos estados.
- Varios ítems.
- Eventos.
- Un plano de ejemplo generado o libre de restricciones.

El seed debe estar claramente identificado como demostración.

No debe ejecutarse automáticamente en producción.

------

# 30. PRIMERA EJECUCIÓN SOLICITADA

En esta primera intervención no intentes construir todo el producto.

Debes realizar únicamente la Fase 0.

Orden de trabajo:

1. Inspecciona la carpeta actual.
2. Comprueba si está vacía o contiene archivos.
3. No sobrescribas contenido existente sin analizarlo.
4. Crea una propuesta de arquitectura.
5. Registra las decisiones principales.
6. Crea `AGENTS.md`.
7. Crea `README.md`.
8. Crea `ROADMAP.md`.
9. Crea `CHANGELOG.md`.
10. Crea `docs/progress/CURRENT_STATUS.md`.
11. Configura el monorepositorio.
12. Configura TypeScript.
13. Configura lint y formato.
14. Configura la aplicación web mínima.
15. Configura PostgreSQL.
16. Configura ORM.
17. Crea Docker Compose para desarrollo.
18. Añade healthcheck.
19. Añade `.env.example`.
20. Verifica que el proyecto levanta.
21. Ejecuta lint.
22. Ejecuta typecheck.
23. Ejecuta pruebas mínimas.
24. Ejecuta build.
25. Actualiza toda la documentación.
26. Entrega un resumen real del estado.

No avances a usuarios, proyectos ni activos hasta que la Fase 0 esté validada.

Si el entorno impide alguna validación, no inventes el resultado. Documenta exactamente el bloqueo y proporciona los comandos para validarlo posteriormente.

------

# 31. CRITERIO DE CALIDAD

El resultado debe permitir que una IA diferente entre posteriormente al repositorio y entienda en pocos minutos:

- Qué es el proyecto.
- Qué arquitectura utiliza.
- Qué se ha construido.
- Qué funciona.
- Qué no funciona.
- Qué está pendiente.
- Qué decisiones se tomaron.
- Qué archivos son importantes.
- Cómo levantarlo.
- Cómo validarlo.
- Qué tarea debe ejecutar después.

La continuidad entre agentes es un requisito funcional del proyecto, no una tarea secundaria.

Empieza ahora con la Fase 0 y no avances más allá hasta completar y validar sus criterios de aceptación.