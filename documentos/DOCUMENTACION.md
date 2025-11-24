# Generador de Taxonomías XBRL - Documentación Completa

## Descripción del Proyecto

Aplicación web diseñada para automatizar la generación de taxonomías XBRL para empresas de servicios públicos en Colombia, cumpliendo con los requisitos de reporte de la Superintendencia de Servicios Públicos Domiciliarios (SSPD).

### Problema que Resuelve

Los contadores de las empresas de servicios públicos se niegan a diligenciar manualmente las 40+ hojas de los formularios XBRL debido a su complejidad. Esta aplicación automatiza el 80-90% del trabajo tedioso, reduciendo el tiempo de preparación de 8 horas a 2-3 horas por taxonomía.

### Flujo de Trabajo Actual vs. Propuesto

**ANTES (Manual - 8 horas)**:
1. Recibir balance consolidado del contador
2. Copiar a plantilla intermedia (PlantillaNIIF.xlsx)
3. Distribuir manualmente por servicios con fórmulas
4. Copiar manualmente a las 40+ hojas de la plantilla oficial XBRL
5. Cargar en XBRL Express
6. Validar y corregir errores
7. Generar `.xbrl` y subir al SUI

**DESPUÉS (Semi-automatizado - 2-3 horas)**:
1. **Aplicación Web (10 min)**: Cargar balance → Configurar % → Descargar .zip
2. **XBRL Express (2-3 horas)**: Abrir archivos → Completar 34 hojas manuales → Validar → Generar `.xbrl`
3. **SUI (5 min)**: Certificar

## Arquitectura Técnica

### Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS 4
- **Procesamiento Excel**: xlsx (SheetJS)
- **Generación XML**: js2xmlparser
- **Empaquetado**: file-saver + jszip
- **Sin Backend**: Aplicación stateless (privacy-first)

### Estructura del Proyecto

```
xbrl-generator/
├── client/                    # Frontend React
│   ├── public/               # Archivos estáticos
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   │   └── ui/          # Componentes shadcn/ui
│   │   ├── lib/             # Utilidades
│   │   │   ├── excelProcessor.ts    # Lectura y procesamiento de Excel
│   │   │   └── xbrlGenerator.ts     # Generación de archivos XBRL
│   │   ├── pages/
│   │   │   └── Home.tsx     # Página principal (3 pasos)
│   │   ├── App.tsx          # Configuración de rutas
│   │   └── main.tsx         # Punto de entrada
│   ├── package.json
│   └── vite.config.ts
├── todo.md                   # Lista de tareas del proyecto
├── README.md                 # Instrucciones básicas
└── DOCUMENTACION.md          # Este archivo

Documentos de Análisis (en /home/ubuntu/):
├── informe_analisis_xbrl.md              # Análisis de la aplicación XBRL Express
├── analisis_comparativo_niif.md          # Comparación de grupos NIIF
├── especificacion_requisitos_webapp.md   # Requisitos funcionales
├── arquitectura_solucion_xbrl_web.md     # Diseño de arquitectura
├── flujo_usuario_optimizado.md           # Flujo de usuario
├── alcance_automatizacion_actualizado.md # Alcance de automatización
└── estructura_puc_colombia.md            # Estructura del PUC
```

## Funcionalidades Implementadas

### ✅ Completadas

1. **Interfaz de 3 Pasos**
   - Paso 1: Cargar balance consolidado (Excel)
   - Paso 2: Configurar porcentajes de distribución por servicios
   - Paso 3: Generar y descargar paquete XBRL

2. **Procesamiento de Excel**
   - Detección automática de encabezados (CÓDIGO, DENOMINACIÓN, Total)
   - Soporte para archivos con tildes y caracteres especiales
   - Lectura de todas las longitudes de cuenta (1, 2, 4, 6 dígitos)
   - Filtrado de cuentas "hoja" (sin hijos) para evitar doble contabilización

3. **Validaciones**
   - Validación de estructura del balance
   - Validación de que los porcentajes sumen 100%
   - Validación de ecuaciones contables (Activo = Pasivo + Patrimonio)
   - Indicadores visuales de errores

4. **Generación de Archivos XBRL**
   - Plantilla Excel XBRL diligenciada (.xlsx)
   - Archivo de mapeo XML (.xml)
   - Plantilla XBRL (.xbrlt)
   - Empaquetado en archivo ZIP

5. **Vista Previa y Depuración**
   - Información de depuración visible en la interfaz
   - Distribución de cuentas antes y después del filtro
   - Totales calculados por tipo de cuenta

### ⚠️ Pendientes (Problemas Conocidos)

1. **Error en la Suma de Activos**
   - **Problema**: La suma de activos da $904,113,969.1 en lugar de $65,921,694.55
   - **Causa**: Aunque el filtro de cuentas hoja funciona correctamente (3,323 cuentas), hay un error en cómo se están sumando los valores en el navegador
   - **Estado**: En investigación - El mismo código funciona correctamente en Python/Node.js pero falla en el navegador
   - **Próximo paso**: Identificar por qué el navegador suma valores incorrectos a pesar de tener las cuentas correctas

2. **Integración con Plantillas Oficiales**
   - Cargar las plantillas Excel oficiales de la SSPD para cada grupo NIIF
   - Mapear las ~3,700 cuentas PUC a las celdas específicas de cada formulario
   - Implementar mapeo avanzado usando los archivos `.xml` reales de XBRL Express

3. **Hojas Específicas a Diligenciar**
   - Solo 11 de 45 hojas se automatizan actualmente:
     * [210000] Estado de situación financiera
     * [310000] Estado de resultados
     * [900017a-c,g] FC01 - Gastos de servicios públicos
     * [900019] FC02 - Complementario ingresos
     * [900021-23] FC03 - CXC por estrato
     * [900032] FC09 - Detalle de costo de ventas

## Instalación y Configuración Local

### Requisitos Previos

- **Node.js**: v22.13.0 o superior
- **pnpm**: v9.15.4 o superior (o npm/yarn)
- **Navegador**: Chrome, Edge, o Firefox actualizado

### Instalación

```bash
# 1. Navegar al directorio del proyecto
cd xbrl-generator

# 2. Instalar dependencias
pnpm install

# 3. Iniciar el servidor de desarrollo
pnpm dev

# 4. Abrir en el navegador
# La aplicación estará disponible en http://localhost:3000
```

### Scripts Disponibles

```bash
# Desarrollo
pnpm dev          # Iniciar servidor de desarrollo con hot-reload

# Producción
pnpm build        # Compilar para producción
pnpm preview      # Previsualizar build de producción

# Calidad de código
pnpm lint         # Ejecutar linter
pnpm type-check   # Verificar tipos TypeScript
```

## Uso de la Aplicación

### Paso 1: Cargar Balance Consolidado

1. Seleccionar el **Grupo NIIF** de la empresa:
   - Grupo 1 - NIIF Plenas
   - Grupo 2 - NIIF PYMES
   - Grupo 3 - Microempresas
   - R414 - ESAL

2. **Cargar archivo Excel** con el balance consolidado:
   - **Formato requerido**: 3 columnas (CÓDIGO, DENOMINACIÓN, Total)
   - **Sin fórmulas**: Los valores deben estar como números, no como fórmulas
   - **Estructura jerárquica**: Incluir todas las cuentas (clase, grupo, cuenta, subcuenta)

3. **Verificar información de depuración**:
   - Total cuentas leídas
   - Total cuentas hoja (filtradas)
   - Distribución antes y después del filtro
   - Advertencias de ecuación contable

### Paso 2: Configurar Porcentajes

1. **Asignar porcentajes** de distribución para cada servicio:
   - Acueducto: % (ej: 40%)
   - Alcantarillado: % (ej: 20%)
   - Aseo: % (ej: 40%)

2. **Validación automática**: La suma debe ser exactamente 100%

### Paso 3: Generar Taxonomía

1. Hacer clic en **"Generar Taxonomía XBRL"**
2. Esperar el procesamiento (1-2 minutos)
3. **Descargar el archivo ZIP** generado

### Contenido del ZIP

```
Grupo2_Individual_Directo_ID20037_2024-12-31.zip
├── Grupo2_Individual_Directo_ID20037_2024-12-31.xlsx    # Plantilla Excel diligenciada
├── Grupo2_Individual_Directo_ID20037_2024-12-31.xml     # Archivo de mapeo
└── Grupo2_Individual_Directo_ID20037_2024-12-31.xbrlt   # Plantilla XBRL
```

### Uso con XBRL Express

1. **Abrir XBRL Express**
2. **Cargar los archivos** del ZIP generado
3. **Completar las 34 hojas restantes** que requieren información cualitativa
4. **Validar** hasta que el resultado diga "sin errores"
5. **Generar el archivo `.xbrl` final**
6. **Reportar en la plataforma SUI**

## Estructura del Plan Único de Cuentas (PUC) en Colombia

### Niveles Jerárquicos

- **Clase**: 1 dígito (ej: `1` = Activos)
- **Grupo**: 2 dígitos (ej: `11` = Efectivo)
- **Cuenta**: 4 dígitos (ej: `1105` = Caja)
- **Subcuenta**: 6 dígitos (ej: `110501` = Caja principal)
- **Auxiliar**: 7+ dígitos (ej: `11050101` = Caja principal - Sede A)

### Filtrado de Cuentas Hoja

Para evitar doble contabilización, solo se suman las **cuentas "hoja"** (aquellas que NO tienen otras cuentas debajo). Esto se determina dinámicamente:

```typescript
// Ejemplo: Si existen las cuentas
1       ACTIVOS                    → NO es hoja (tiene 11, 12, etc. debajo)
11      EFECTIVO                   → NO es hoja (tiene 1105, 1110, etc. debajo)
1105    CAJA                       → NO es hoja (tiene 110501, 110502 debajo)
110501  Caja principal             → SÍ es hoja (no tiene cuentas debajo)
110502  Caja menor                 → SÍ es hoja (no tiene cuentas debajo)
```

## Clasificación NIIF en Colombia

### Grupo 1 - NIIF Plenas
- Empresas grandes y medianas
- **66 hojas** en la taxonomía
- **16,237 mapeos** XML
- Máxima complejidad

### Grupo 2 - NIIF PYMES
- Pequeñas y medianas empresas
- **45 hojas** en la taxonomía
- **13,355 mapeos** XML
- Complejidad media

### Grupo 3 - Microempresas
- Microempresas
- **30 hojas** en la taxonomía
- **7,520 mapeos** XML
- Simplificado

### R414 - ESAL
- Entidades Sin Ánimo de Lucro
- **43 hojas** en la taxonomía
- **13,415 mapeos** XML
- Especializado

## Taxonomías SSPD

Cada grupo usa su propia taxonomía publicada en www.sui.gov.co, con dimensiones para segregar información por tipo de servicio público:

- **Acueducto** (AAA)
- **Alcantarillado** (AAA)
- **Aseo** (AAA)
- **Energía**
- **Gas**
- **Telecomunicaciones**

## Próximos Pasos de Desarrollo

### Prioridad Alta

1. **Corregir el error de suma de activos** (bug crítico)
2. **Integrar plantillas oficiales** de la SSPD
3. **Implementar mapeo real** de cuentas PUC a celdas Excel

### Prioridad Media

4. **Agregar guardado de configuraciones** en localStorage
5. **Mejorar validaciones** de ecuaciones contables
6. **Agregar soporte para más servicios** (energía, gas, etc.)

### Prioridad Baja

7. **Implementar generación de las 34 hojas restantes** (notas, revelaciones)
8. **Agregar exportación a PDF** de los reportes
9. **Crear dashboard de productividad** (opcional)

## Recursos y Referencias

### Documentación Oficial

- [Superintendencia de Servicios Públicos Domiciliarios (SSPD)](https://www.superservicios.gov.co/)
- [Sistema Único de Información (SUI)](https://www.sui.gov.co/)
- [Plan Único de Cuentas (PUC) Colombia](https://puc.com.co/)

### Tecnologías Utilizadas

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [SheetJS (xlsx)](https://sheetjs.com/)

### Documentos de Análisis

Todos los documentos de análisis están disponibles en `/home/ubuntu/`:

1. **informe_analisis_xbrl.md** - Análisis completo de la aplicación XBRL Express original
2. **analisis_comparativo_niif.md** - Comparación detallada de los 4 grupos NIIF
3. **especificacion_requisitos_webapp.md** - Requisitos funcionales y no funcionales
4. **arquitectura_solucion_xbrl_web.md** - Diseño de arquitectura técnica
5. **flujo_usuario_optimizado.md** - Flujo de usuario antes vs. después
6. **alcance_automatizacion_actualizado.md** - Alcance preciso de la automatización
7. **estructura_puc_colombia.md** - Estructura del PUC en Colombia

## Soporte y Contacto

Para preguntas, sugerencias o reporte de bugs, consultar el archivo `todo.md` del proyecto que contiene el estado actual de todas las funcionalidades y problemas conocidos.

---

**Versión**: 1.0.0 (MVP)  
**Última actualización**: Noviembre 2025  
**Estado**: En desarrollo - Prototipo funcional con bug conocido en suma de activos
