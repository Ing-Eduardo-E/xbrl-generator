# Plan de Desarrollo: Módulo de Proyección Trimestral

## Resumen Ejecutivo

Crear un módulo **independiente** que reciba un Excel con balances consolidados anuales y genere 4 archivos Excel trimestrales (Q1–Q4). Estos Excel de salida tienen el mismo formato que el Excel de entrada, por lo que pueden ser re-ingresados al flujo existente de distribución por servicio + generación de taxonomías XBRL.

**Filosofía:** 0 modificaciones al código existente (excepto 2 líneas para registrar el router tRPC).

---

## Concepto de Negocio

### Problema
Las empresas de servicios públicos deben reportar trimestralmente al SSPD. Sin embargo, muchas solo tienen el balance anual consolidado. Actualmente no hay forma automatizada de proyectar ese balance anual a 4 trimestres.

### Solución
1. **Importar** el Excel con balance anual consolidado
2. **Clasificar** automáticamente las cuentas en:
   - **Estáticas**: mantienen su valor todo el año (activos fijos, patrimonio, deuda LP)
   - **Dinámicas**: cambian con la actividad operativa (efectivo, CxC, ingresos, gastos, costos)
3. **Proyectar** valores trimestrales:
   - Cuentas estáticas → mismo valor en los 4 trimestres
   - Cuentas dinámicas → porcentaje progresivo del valor anual:
     - Q1: 15% | Q2: 30% | Q3: 75% | Q4: 100%
4. **Descargar** 4 archivos Excel (o 1 ZIP) con el consolidado trimestral

### Flujo posterior (existente, no se modifica)
Cada Excel trimestral generado se puede subir individualmente al flujo normal:
`Cargar → Distribuir por servicio → Generar taxonomía XBRL`

---

## Clasificación de Cuentas PUC

### Cuentas ESTÁTICAS (valor constante todo el año)

| Prefijo | Descripción | Justificación |
|---------|-------------|---------------|
| `1132` | Efectivo restringido | Fondos inmovilizados |
| `1227`, `1230`, `1233` | Inversiones LP (participación) | Solo cambian por adquisición/disposición |
| `14` | Préstamos por cobrar LP | Amortización programada |
| `16` | Propiedad, planta y equipo | Solo cambian por adiciones/bajas |
| `17` | Bienes de uso público | Infraestructura de largo plazo |
| `18` | Recursos naturales | Sin variación trimestral |
| `1970`–`1975` | Intangibles | Solo cambian por adquisición |
| `21` | Emisión títulos de deuda | Deuda estructural |
| `25` | Provisiones | Solo por nueva contingencia |
| `31` | Patrimonio institucional | Solo por capitalización formal |
| `32` | Resultados acumulados | Ejercicios anteriores cerrados |
| `33` | Reservas | Constitución formal |
| `34` | Superávit | Valorización/revalorización |
| `35` | Participaciones no controladoras | Pactos societarios |
| `36` | Ganancias retenidas | Decisión junta |
| `38` | Acciones propias | Recompra programada |
| `8`, `9` | Cuentas de orden | Contingencias, no monetarias |

### Cuentas DINÁMICAS (se proyectan trimestralmente)

| Prefijo | Descripción | Justificación |
|---------|-------------|---------------|
| `11` (excepto `1132`) | Efectivo y equivalentes | Recaudo y pagos operacionales |
| `12` (excepto LP) | Inversiones CP | Rotación por tesorería |
| `13` | Cuentas por cobrar | Facturación y recaudo |
| `15` | Inventarios | Consumo y reposición |
| `19` (excepto intangibles) | Otros activos | Pagos anticipados |
| `22` | Préstamos por pagar | Porción corriente de deuda |
| `23` | Cuentas por pagar | Proveedores y contratistas |
| `24` | Beneficios a empleados | Nómina y prestaciones |
| `26` | Otros pasivos | Anticipos y diferidos |
| `27` | Pasivos por impuestos | IVA, retención, renta |
| `37` | Resultado del ejercicio | Utilidad/pérdida acumulada |
| `4` (toda la clase) | Ingresos | Acumulación trimestral |
| `5` (toda la clase) | Gastos | Acumulación trimestral |
| `6` (toda la clase) | Costos de ventas | Proporcional a actividad |

### Porcentajes de Proyección por Defecto

| Trimestre | % del valor anual | Lógica |
|-----------|:-:|--------|
| Q1 (Ene–Mar) | 15% | Arranque de operaciones |
| Q2 (Abr–Jun) | 30% | Primer semestre acumula 30% |
| Q3 (Jul–Sep) | 75% | Tres cuartos del año |
| Q4 (Oct–Dic) | 100% | Valor anual completo |

> **Nota:** Estos porcentajes son configurables por el usuario antes de generar.

### Regla Contable Obligatoria: Activos = Pasivos + Patrimonio

**Cada archivo Excel trimestral DEBE cumplir la ecuación contable fundamental:**

$$Activos = Pasivos + Patrimonio$$

Esta validación aplica sobre la suma de cuentas hoja (`isLeaf = true`) por clase.

#### Problema

Al proyectar cuentas dinámicas con `Math.round(valor * porcentaje / 100)`, los errores de redondeo individuales se acumulan y rompen la ecuación contable. Ejemplo:

| Cuenta | Anual | Q1 (15%) sin ajuste |
|--------|------:|--------------------:|
| 1105 Caja | 1.333 | 200 (Math.round(199.95)) |
| 1110 Bancos | 2.667 | 400 (Math.round(400.05)) |
| **Total Activos** | **4.000** | **600** |
| 2105 Obligaciones | 2.500 | 375 |
| 3105 Capital | 1.500 | 225 |
| **Pasivos + Patrimonio** | **4.000** | **600** ✓ |

En la práctica con centenas de cuentas, la diferencia puede ser de ±1 a ±5 pesos.

#### Algoritmo de Balanceo (post-redondeo)

Se ejecuta **después** de proyectar y redondear todas las cuentas de un trimestre:

```
1. Calcular totales de hojas:
   totalActivos = Σ(cuentas hoja clase 1)
   totalPasivos = Σ(cuentas hoja clase 2)
   totalPatrimonio = Σ(cuentas hoja clase 3)

2. diferencia = totalActivos - (totalPasivos + totalPatrimonio)

3. Si diferencia === 0 → OK, no hacer nada

4. Si diferencia !== 0 → Ajustar UNA cuenta hoja dinámica:
   a. Si diferencia > 0 (Activos > P+Pt):
      - Buscar la cuenta hoja DINÁMICA de clase 1 con mayor |valor|
      - Restarle la diferencia: cuenta.value -= diferencia
   b. Si diferencia < 0 (Activos < P+Pt):
      - Buscar la cuenta hoja DINÁMICA de clase 2 ó 3 con mayor |valor|
      - Sumarle la diferencia (en valor absoluto): cuenta.value += |diferencia|

5. Verificar: assert(Σ activos hojas === Σ pasivos hojas + Σ patrimonio hojas)
```

**¿Por qué ajustar la cuenta dinámica de mayor valor?** Porque el impacto relativo del ajuste de ±1 a ±5 pesos es despreciable en una cuenta de millones.

#### Requisitos de implementación

- **Valores enteros**: Todos los valores en el Excel de salida deben ser `number` enteros sin decimales. Usar `Math.round()` en la proyección.
- **Ecuación exacta**: La diferencia final DEBE ser 0, no "dentro de tolerancia". El Excel debe cuadrar perfectamente.
- **Solo ajustar hojas dinámicas**: Nunca modificar cuentas estáticas ni cuentas padre.
- **Recalcular padres**: Después del ajuste, los totales de cuentas padre se recalculan sumando sus hijos.
- **Reutilizar**: Invocar `calculateTotalsByClass()` y `validateAccountingEquation()` de `pucUtils.ts` para la validación final.

---

## Arquitectura Técnica

### Archivos a crear

```
app/src/
├── lib/services/
│   ├── accountClassification.ts     ← Clasificación estática vs dinámica
│   ├── projectionEngine.ts          ← Motor de cálculo trimestral
│   └── quarterlyExcelGenerator.ts   ← Genera 4 Excel de salida
│
├── server/routers/
│   └── projection.ts                ← Router tRPC independiente
│
├── app/proyeccion-trimestral/
│   └── page.tsx                     ← Página Next.js App Router
│
└── components/projection/
    ├── ProjectionWizard.tsx          ← Orquestador del wizard
    ├── ProjectionUploadStep.tsx      ← Paso 1: Subir Excel
    ├── ProjectionClassifyStep.tsx    ← Paso 2: Ver clasificación
    ├── ProjectionConfigStep.tsx      ← Paso 3: Configurar %
    └── ProjectionResultStep.tsx      ← Paso 4: Descargar
```

### Único punto de integración existente

Archivo: `src/server/routers/index.ts` — agregar 2 líneas:

```typescript
import { projectionRouter } from './projection';

export const appRouter = router({
  balance: balanceRouter,
  projection: projectionRouter,  // ← nueva línea
});
```

### Reutilización de código existente (sin modificar)

| Módulo existente | Cómo se reutiliza |
|---|---|
| `excelParser.ts` → `parseExcelFile()` | Parsear el Excel de entrada |
| `pucUtils.ts` → `PUC_CLASSES`, `getClassDigit()` | Clasificar cuentas |
| `WizardLayout.tsx` | Shell visual del wizard |
| `utils.ts` → `formatCurrency()`, `cn()` | Formateo de valores |
| shadcn/ui (`Card`, `Button`, `Input`, `Select`, `Progress`, `Label`) | Componentes UI |
| `TRPCProvider` (via `layout.tsx`) | Heredado automáticamente |
| `xlsx` (SheetJS) | Generar Excel de salida |

---

## Plan de Implementación (4 Agentes)

### Agente 1 — Backend: Clasificación + Motor de Proyección

**Archivos a crear:**

#### 1.1 `src/lib/services/accountClassification.ts`

```typescript
export type AccountBehavior = 'static' | 'dynamic';

interface ClassificationRule {
  prefixes: string[];
  behavior: AccountBehavior;
  description: string;
}

// Reglas ordenadas de más específica a menos específica
export const CLASSIFICATION_RULES: ClassificationRule[];

// Clasifica una cuenta individual
export function classifyAccount(code: string): AccountBehavior;

// Separa un array de cuentas
export function partitionAccounts(accounts: ParsedAccount[]): {
  static: ParsedAccount[];
  dynamic: ParsedAccount[];
  summary: { totalStatic: number; totalDynamic: number; staticPercent: number };
};
```

#### 1.2 `src/lib/services/projectionEngine.ts`

```typescript
export interface ProjectionConfig {
  percentages: { q1: number; q2: number; q3: number; q4: number };
  year: number;
}

export interface QuarterlyProjection {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  label: string;          // "1er Trimestre 2025"
  accounts: ParsedAccount[];
  totals: ParsedBalance['totals'];
  balanceValidation: {
    activos: number;
    pasivos: number;
    patrimonio: number;
    difference: number;      // Debe ser 0
    adjustedAccount?: string; // Código de la cuenta ajustada (si aplica)
    adjustmentAmount?: number; // Monto del ajuste aplicado
  };
}

// Genera 4 proyecciones trimestrales con balanceo contable
export function projectQuarterly(
  accounts: ParsedAccount[],
  config: ProjectionConfig
): QuarterlyProjection[];

// Aplica ajuste de redondeo para que Activos = Pasivos + Patrimonio
// Modifica in-place la cuenta dinámica de mayor valor en la clase correspondiente
export function balanceAccountingEquation(
  accounts: ParsedAccount[],
  classification: Map<string, AccountBehavior>
): { adjustedCode: string | null; adjustmentAmount: number };
```

**Lógica del motor:**
- Para cada cuenta:
  - Si `classifyAccount(code) === 'static'` → valor = valor original (los 4 trimestres)
  - Si `classifyAccount(code) === 'dynamic'` → valor = `Math.round(valorOriginal * porcentaje / 100)`
- Después de proyectar, recalcular `calculateTotalsByClass()` por cada trimestre
- Q4 siempre tiene el valor original completo (100%)
- **CRÍTICO: Aplicar algoritmo de balanceo contable** después de cada trimestre:
  1. Calcular `diferencia = totalActivos - (totalPasivos + totalPatrimonio)` sobre hojas
  2. Si `diferencia !== 0`, ajustar la cuenta hoja dinámica de mayor valor absoluto
     en la clase apropiada (clase 1 si diferencia > 0, clase 2 ó 3 si diferencia < 0)
  3. Recalcular cuentas padre sumando hijos
  4. Verificar con `validateAccountingEquation(accounts, 0)` — tolerancia 0
- Todos los valores en el output son enteros (`Math.round`), sin decimales

#### 1.3 Tests: `src/lib/services/__tests__/accountClassification.test.ts`

- classifyAccount para códigos representativos de cada clase
- partitionAccounts con mix de cuentas
- Casos borde: código vacío, código desconocido, cuentas de orden

#### 1.4 Tests: `src/lib/services/__tests__/projectionEngine.test.ts`

- Proyección con porcentajes por defecto
- Cuentas estáticas mantienen valor en todos los trimestres
- Q4 es siempre 100% (valores idénticos al original)
- Totales correctos por trimestre
- **Ecuación contable exacta: Activos === Pasivos + Patrimonio (diferencia = 0) en cada trimestre**
- Todos los valores son enteros (sin decimales)
- Algoritmo de balanceo ajusta la cuenta correcta cuando hay diferencia de redondeo
- El ajuste nunca excede ±10 pesos (sanity check)

---

### Agente 2 — Backend: Generador de Excel + Router tRPC

**Archivos a crear:**

#### 2.1 `src/lib/services/quarterlyExcelGenerator.ts`

```typescript
// Genera un Excel con el formato exacto que parseExcelFile() espera
export function generateQuarterlyExcel(
  accounts: ParsedAccount[],
  quarterLabel: string
): Buffer;

// Genera 4 Excel y retorna como ZIP base64
export function generateQuarterlyZip(
  projections: QuarterlyProjection[],
  companyName: string,
  year: number
): Promise<string>; // base64
```

**Formato del Excel de salida:**
- 1 hoja llamada `"Consolidado"`
- Columnas: `Código` | `Denominación` | `Total`
- Valores: enteros sin formato monetario ni decimales
- Ecuación contable cumplida: Activos = Pasivos + Patrimonio (diferencia = 0)
- Compatible 100% con `parseExcelFile()` para re-ingesta

#### 2.2 `src/server/routers/projection.ts`

```typescript
export const projectionRouter = router({
  // Parsea Excel y retorna cuentas clasificadas
  uploadAndClassify: publicProcedure
    .input(z.object({
      fileData: z.string().max(10_485_760),
      fileName: z.string().max(255),
    }))
    .mutation(async ({ input }) => {
      const parsed = await parseExcelFile(input.fileData, input.fileName);
      const { static: staticAccounts, dynamic: dynamicAccounts, summary } =
        partitionAccounts(parsed.accounts);
      return { accounts: parsed.accounts, staticAccounts, dynamicAccounts, summary, totals: parsed.totals };
    }),

  // Genera proyección con preview
  previewProjection: publicProcedure
    .input(z.object({
      accounts: z.array(z.object({
        code: z.string(),
        name: z.string(),
        value: z.number(),
        isLeaf: z.boolean(),
        level: z.number(),
        class: z.string(),
      })),
      config: z.object({
        percentages: z.object({
          q1: z.number().min(0).max(100),
          q2: z.number().min(0).max(100),
          q3: z.number().min(0).max(100),
          q4: z.number().min(0).max(100),
        }),
        year: z.number().min(2020).max(2030),
      }),
    }))
    .mutation(async ({ input }) => {
      const projections = projectQuarterly(input.accounts, input.config);
      return { projections };
    }),

  // Genera ZIP con 4 Excel
  generateExcels: publicProcedure
    .input(z.object({
      accounts: z.array(z.object({
        code: z.string(),
        name: z.string(),
        value: z.number(),
        isLeaf: z.boolean(),
        level: z.number(),
        class: z.string(),
      })),
      config: z.object({
        percentages: z.object({
          q1: z.number().min(0).max(100),
          q2: z.number().min(0).max(100),
          q3: z.number().min(0).max(100),
          q4: z.number().min(0).max(100),
        }),
        year: z.number().min(2020).max(2030),
      }),
      companyName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const projections = projectQuarterly(input.accounts, input.config);
      const zipBase64 = await generateQuarterlyZip(
        projections,
        input.companyName ?? 'Empresa',
        input.config.year
      );
      return { zipBase64, fileName: `Proyeccion_Trimestral_${input.config.year}.zip` };
    }),
});
```

#### 2.3 Tests: `src/server/routers/__tests__/projection.test.ts`

- uploadAndClassify con Excel de prueba
- previewProjection retorna 4 trimestres con totales correctos
- generateExcels retorna ZIP base64 válido

---

### Agente 3 — Frontend: Página + Wizard (Pasos 1-2)

**Archivos a crear:**

#### 3.1 `src/app/proyeccion-trimestral/page.tsx`

```typescript
'use client';
// Página independiente con su propio estado
// Monta ProjectionWizard como componente principal
// Hereda TRPCProvider del layout.tsx raíz
```

#### 3.2 `src/components/projection/ProjectionWizard.tsx`

```
Estado local:
- currentStep: 'upload' | 'classify' | 'config' | 'result'
- accounts: ParsedAccount[] (se mantiene en memoria, NO en BD)
- classification: { static, dynamic, summary }
- config: { percentages, year }
- projections: QuarterlyProjection[]

Pasos del wizard:
1. Cargar Excel → parseExcelFile
2. Clasificar → muestra resumen estático vs dinámico
3. Configurar → porcentajes y año
4. Resultado → preview + descarga ZIP
```

#### 3.3 `src/components/projection/ProjectionUploadStep.tsx`

- Drag & drop (reutiliza el patrón de UploadStep)
- Llama `trpc.projection.uploadAndClassify.useMutation()`
- Toast de éxito/error con sonner
- Muestra resumen: "X cuentas procesadas"

#### 3.4 `src/components/projection/ProjectionClassifyStep.tsx`

- Dos tablas resumen: Estáticas vs Dinámicas
- Cards con totales por clase contable
- Badge verde/azul para identificar tipo
- Botón "Continuar" / "Volver"

---

### Agente 4 — Frontend: Wizard (Pasos 3-4)

#### 4.1 `src/components/projection/ProjectionConfigStep.tsx`

- 4 sliders o inputs numéricos para Q1/Q2/Q3/Q4
- Valores por defecto pre-cargados: 15/30/75/100
- Input de año (Select con 2020-2030)
- Preview en tabla: 
  ```
  | Trimestre | % | Total Activos | Total Pasivos | Total Patrimonio | A=P+Pt |
  |-----------|---|---------------|---------------|------------------|--------|
  | Q1        |15%| $XXX.XXX      | $XXX.XXX      | $XXX.XXX         |   ✓    |
  ```
- Indicador ✓/✗ de ecuación contable por trimestre
- Si hubo ajuste de redondeo, mostrar nota: "Ajuste de X pesos en cuenta YYYY"
- Validación: Q4 siempre 100% (bloqueado o con advertencia)
- Llama `trpc.projection.previewProjection.useMutation()` al cambiar config

#### 4.2 `src/components/projection/ProjectionResultStep.tsx`

- Cards con totales por trimestre (similar a los 3 servicios del paso actual)
- Tabla expandible por trimestre mostrando las 10 cuentas con mayor variación
- Botón "Descargar ZIP (4 Excel)" → `trpc.projection.generateExcels.useMutation()`
- Spinner durante generación, toast de éxito
- `downloadBase64File()` para trigger descarga
- Botón "Nueva proyección" → reset wizard
- Mensaje informativo: "Puede subir cada Excel trimestral al generador IFE"

---

## Secuencia de Implementación

```
Fase 1 (Agente 1): accountClassification.ts + projectionEngine.ts + tests
  ↓
Fase 2 (Agente 2): quarterlyExcelGenerator.ts + projection.ts router + tests
  ↓ (depende de Fase 1)
Fase 3 (Agente 3): page.tsx + ProjectionWizard + Upload + Classify steps
  ↓ (depende de Fase 2 para tRPC types)  
Fase 4 (Agente 4): Config + Result steps + integración completa
  ↓ (depende de Fase 3)
Fase 5: Smoke test manual end-to-end
```

> **Nota:** Fases 1-2 (backend) son independientes de Fases 3-4 (frontend) excepto por los tipos tRPC. Se pueden paralelizar si se definen los tipos primero.

---

## Estimación de Archivos y Complejidad

| Archivo | Líneas est. | Complejidad |
|---------|:-:|:-:|
| `accountClassification.ts` | ~80 | Baja |
| `projectionEngine.ts` | ~60 | Baja |
| `quarterlyExcelGenerator.ts` | ~100 | Media |
| `projection.ts` (router) | ~120 | Media |
| `page.tsx` | ~30 | Baja |
| `ProjectionWizard.tsx` | ~120 | Media |
| `ProjectionUploadStep.tsx` | ~150 | Media |
| `ProjectionClassifyStep.tsx` | ~120 | Baja |
| `ProjectionConfigStep.tsx` | ~180 | Media |
| `ProjectionResultStep.tsx` | ~160 | Media |
| Tests (3 archivos) | ~200 | Media |
| **Total** | **~1,320** | — |

---

## Validaciones Requeridas

- [ ] Excel de salida es re-ingestable por `parseExcelFile()` sin errores  
- [ ] Q4 produce valores idénticos al Excel original
- [ ] Cuentas estáticas no cambian entre trimestres
- [ ] **Ecuación contable EXACTA: Activos = Pasivos + Patrimonio (diferencia = 0)** en cada trimestre
- [ ] Todos los valores son enteros sin decimales
- [ ] Algoritmo de balanceo ajusta correctamente cuando hay diferencia de redondeo
- [ ] ZIP contiene exactamente 4 archivos .xlsx
- [ ] Cada Excel tiene hoja "Consolidado" con columnas Código/Denominación/Total
- [ ] No se modificó ningún archivo existente (excepto router/index.ts)
