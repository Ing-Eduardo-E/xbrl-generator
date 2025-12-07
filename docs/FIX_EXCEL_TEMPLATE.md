# Guía de Reparación: Error "Shared Formula" en Plantilla IFE

## Problema
Al generar el reporte IFE, el servidor falla con el error:
`"Shared Formula master must exist above and or left of clone for cell L26"`

Esto ocurre debido a una incompatibilidad entre la librería `ExcelJS` y la forma en que Excel agrupa fórmulas repetidas (Shared Formulas) en la plantilla oficial.

## Solución Manual (1-2 minutos)

Sigue estos pasos para reparar el archivo de plantilla **una sola vez**.

### 1. Ubicar el Archivo
Ve a la carpeta del proyecto:
`app/public/templates/ife/`

Abre el archivo:
`IFE_SegundoTrimestre_ID20037_2025-06-30.xlsx`

### 2. Identificar el Problema
1. Ve a la **Hoja7** (Detalle de ingresos y gastos).
2. Ubica la columna **L** (que corresponde al servicio "xmm").
3. Ubica las filas **14 a 30** (especialmente la fila 26).
4. El error ocurre porque estas celdas contienen fórmulas que "dependen" de una definición maestra que ExcelJS no logra procesar correctamente al guardar.

### 3. Reparar "Rompiendo" la Fórmula Compartida
La meta es hacer que las fórmulas en esas celdas sean independientes o valores simples.

**Opción A (Recomendada - Conservar ceros):**
1. Selecciona las celdas **L14** hasta **L30** en la **Hoja7**.
2. Dale **Copiar** (Ctrl+C).
3. Dale **Pegar Valores** (Click derecho -> Opción '123' Valores).
4. Esto eliminará las fórmulas problemáticas y dejará solo los ceros (0), que es lo correcto para una columna que no usamos.

**Opción B (Si necesitas mantener la fórmula):**
1. Selecciona la celda **L26**.
2. Presiona **F2** para entrar en modo edición.
3. Agrega un espacio al final de la fórmula y presiona **Enter**.
4. Haz lo mismo con las celdas cercanas si es necesario. Esto obliga a Excel a tratarla como una fórmula única, rompiendo el vínculo "Shared".

### 4. Guardar
1. Guarda el archivo (Ctrl+G).
2. Cierra Excel.

## Verificación
Una vez guardado el archivo corregido:
1. Reinicia el servidor de desarrollo (`pnpm dev`).
2. Intenta generar el reporte IFE nuevamente.
3. El error debería desaparecer.
