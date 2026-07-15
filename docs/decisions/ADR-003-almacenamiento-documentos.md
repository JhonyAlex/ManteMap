# ADR-003: Almacenamiento de documentos

## Estado

Aceptada

## Fecha

2026-07-15

## Contexto

El sistema debe almacenar documentos adjuntos (PDFs, imágenes, planos) asociados a ítems. Se necesita:
- Almacenamiento persistente.
- Compatible con desarrollo local y producción.
- No acoplar la lógica a un proveedor específico.
- Preparado para S3, MinIO, Cloudflare R2.

## Opciones consideradas

### Opción A: Almacenamiento directo en disco

- Simple.
- No funciona en entornos multi-instancia.
- Sin CDN.

### Opción B: Acoplamiento directo a S3

- Rendimiento y escalabilidad.
- Vendor lock-in.
- Complejidad en desarrollo local.

### Opción C: Abstracción de almacenamiento

- Interfaz común para múltiples proveedores.
- Desarrollo local con disco.
- Producción con S3/MinIO/R2.
- Complejidad moderada.

## Decisión

**Opción C: Abstracción de almacenamiento**

## Motivo

1. **Portabilidad**: La interfaz `StorageProvider` define `upload`, `download`, `delete`, `getUrl`.
2. **Desarrollo local**: Implementación con disco local (`LocalStorageProvider`).
3. **Producción**: Implementación S3-compatible (`S3StorageProvider`) que funciona con AWS S3, MinIO, y Cloudflare R2.
4. **Configuración**: Variable de entorno `STORAGE_DRIVER` selecciona el proveedor.
5. **Testeable**: Mock del provider para tests.

## Consecuencias

- `packages/shared/src/storage/` contiene la interfaz y implementaciones.
- `STORAGE_DRIVER=local` en desarrollo, `s3` en producción.
- Archivos se nombran con UUID para evitar colisiones.
- Metadatos del archivo en base de datos (nombre original, tipo MIME, tamaño).
- URLs firmadas para acceso temporal en S3.
