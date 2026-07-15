# ADR-004: Diseño de planos interactivos

## Estado

Aceptada

## Fecha

2026-07-15

## Contexto

El sistema permite subir planos (imágenes) y posicionar ítems sobre ellos. Se necesita:
- Visualización responsive del plano.
- Marcadores que representan ítems.
- Coordenadas independientes de la resolución.
- Modo edición para mover marcadores.
- Preparado para zonas y capas en el futuro.

## Opciones consideradas

### Opción A: Canvas HTML5 nativo

- Control total del rendering.
- Mucha código manual para interactividad.
- Sin ecosistema de componentes.

### Opción B: Konva.js / React Konva

- Biblioteca madura para canvas interactivo.
- Soporte nativo para arrastrar, escalar, eventos.
- React Konva = integración limpia con React.
- Soporta capas, grupos, filtros.

### Opción C: SVG interactivo

- Escalable nativamente.
- Bueno para pocos elementos.
- Problemas de rendimiento con muchos marcadores.
- Interactividad limitada para zonas complejas.

### Opción D: Librería de mapas (Leaflet)

- Diseñado para mapas geográficos.
- Overkill para planos de interiores.
- Dependencia pesada.

## Decisión

**Opción B: Konva.js / React Konva**

## Motivo

1. **Nativo para el caso de uso**: Konva está diseñado para canvas interactivo — exactamente lo que necesitamos.
2. **Arrastrar y soltar**: Soporte nativo para drag & drop de marcadores.
3. **Capas**: Soporte nativo de capas (Layer) — esencial para la funcionalidad futura de capas temáticas.
4. **Eventos**: Sistema de eventos robusto (click, dragstart, dragend, mouseenter, etc.).
5. **Rendimiento**: Optimizado para muchos elementos con caching y batch draw.
6. **React Konva**: Integración declarativa con React.

## Diseño de coordenadas

Las posiciones se almacenan como coordenadas normalizadas:

```typescript
interface ItemPosition {
  itemId: string;
  planId: string;
  x: number; // 0 a 1 (horizontal)
  y: number; // 0 a 1 (vertical)
  rotation?: number;
  scale?: number;
  layerId?: string;
}
```

**Ventaja**: Las coordenadas normalizadas permiten que el plano se redibuje a cualquier tamaño sin perder las posiciones de los marcadores.

**Fórmula de conversión**:
- `pixelX = normalizedX * canvasWidth`
- `pixelY = normalizedY * canvasHeight`

## Consecuencias

- Dependencia a `react-konva` y `konva`.
- Coordenadas siempre almacenadas como 0–1.
- Frontend convierte a píxeles según el tamaño actual del canvas.
- Modo edición con toggle explícito para evitar movimientos accidentales.
- Preparado para futuras capas (cada capa = un `Konva.Layer`).
