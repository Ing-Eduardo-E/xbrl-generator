# Flujo de Usuario Optimizado: De 8 Horas a 10 Minutos

**Autor**: Manus AI  
**Fecha**: 21 de noviembre de 2025

Este documento describe el nuevo flujo de trabajo del usuario con la aplicación web propuesta, diseñado para maximizar la eficiencia y reducir drásticamente el tiempo de procesamiento.

## Comparación del Flujo de Trabajo

| Paso | Flujo Actual (Manual - 8 horas) | Flujo Nuevo (Automatizado - 10 minutos) |
| :--- | :--- | :--- |
| **1. Inicio** | Recibir balance consolidado del contador. | Iniciar sesión en la aplicación web. |
| **2. Carga** | Abrir 3 archivos Excel: balance, plantilla intermedia, plantilla XBRL. | **Hacer clic en "Nueva Taxonomía"**. Seleccionar empresa y período. **Cargar el balance consolidado del contador (1 archivo)**. |
| **3. Config.** | (No existe) | **Configurar porcentajes de distribución por servicio** (ej. 40-20-40). El sistema valida que sumen 100%. (Se puede reutilizar configuración anterior). |
| **4. Proceso** | Copiar y pegar ~3,700 cuentas del balance a la plantilla intermedia. Verificar que las fórmulas de distribución funcionen. | **Hacer clic en "Generar Taxonomía"**. El sistema procesa en segundo plano (1-2 minutos). |
| **5. Mapeo** | Copiar y pegar manualmente los datos distribuidos a las ~40-60 hojas de la plantilla XBRL oficial. | **(Paso eliminado)** El sistema mapea automáticamente los datos a las hojas correctas de la plantilla XBRL. |
| **6. Validación** | Cargar la plantilla en XBRL Express. Ejecutar validación. Si hay errores, volver al paso 4. | **(Paso automático)** El sistema valida las ecuaciones contables y la estructura XBRL durante la generación. |
| **7. Generación** | En XBRL Express, generar los archivos finales. | El sistema notifica que el proceso ha finalizado. |
| **8. Descarga** | Guardar los archivos generados. | **Hacer clic en "Descargar Paquete XBRL"**. Se descarga un archivo .zip con todo lo necesario. |
| **9. Finalización** | Abrir los archivos en XBRL Express para diligenciar manualmente las hojas de notas y revelaciones. | Abrir el paquete en XBRL Express. **El sistema indica qué hojas faltan por diligenciar**. El usuario se enfoca solo en esas 5-10 hojas. |
| **10. Reporte** | Validar en XBRL Express hasta que no haya errores. Subir al SUI. | Validar en XBRL Express (ya no debería haber errores de datos). Subir al SUI. |

## El Nuevo Flujo en 5 Pasos (10 Minutos)

El trabajo del consultor se reduce a 5 pasos sencillos dentro de la aplicación web:

1.  **Crear Nueva Taxonomía**: Selecciona la empresa, el período y el grupo NIIF.
    ![Paso 1](https://i.imgur.com/step1.png) _(Imagen conceptual)_

2.  **Cargar Balance**: Sube el archivo Excel que te entregó el contador.
    ![Paso 2](https://i.imgur.com/step2.png) _(Imagen conceptual)_

3.  **Configurar Distribución**: Asigna los porcentajes a cada servicio (Acueducto, Aseo, etc.). El sistema valida que sumen 100%.
    ![Paso 3](https://i.imgur.com/step3.png) _(Imagen conceptual)_

4.  **Generar y Esperar**: Haces clic en "Generar" y el sistema trabaja en segundo plano. En 1-2 minutos, te notifica que está listo.
    ![Paso 4](https://i.imgur.com/step4.png) _(Imagen conceptual)_

5.  **Descargar y Completar**: Descargas el paquete `.zip`. El sistema te dice: "Se han autocompletado 11 hojas. Faltan por diligenciar 34 hojas (ej. Notas, Políticas Contables, etc.)". Abres los archivos en XBRL Express y te enfocas únicamente en esas hojas pendientes.
    ![Paso 5](https://i.imgur.com/step5.png) _(Imagen conceptual)_

## Beneficios del Nuevo Flujo

-   **Reducción del 95% del Tiempo de Procesamiento**: El trabajo activo del consultor pasa de 8 horas a aproximadamente 10 minutos para la parte automatizable. Las 2-3 horas restantes se dedican a la tarea de alto valor de completar las notas y revelaciones específicas.
-   **Eliminación de Errores Manuales**: Se eliminan los errores de copiar y pegar, los errores de fórmulas y los descuadres por redondeo.
-   **Enfoque en el Trabajo de Consultoría**: El consultor deja de ser un "operador de Excel" y se convierte en un supervisor del proceso, enfocándose en la información cualitativa que la máquina no puede generar.
-   **Escalabilidad Masiva**: Al reducir el tiempo por taxonomía, el consultor puede multiplicar por 4 su capacidad de trabajo, pasando de 1 a 4 taxonomías certificadas por día.
-   **Trazabilidad y Control**: Todo el proceso queda registrado en la plataforma, creando un historial auditable para cada cliente y cada reporte.
