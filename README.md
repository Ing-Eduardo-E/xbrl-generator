# Generador de Taxonomías XBRL

Aplicación web para automatizar la generación de taxonomías XBRL desde balances consolidados de empresas de servicios públicos en Colombia.

**Versión**: 2.5
**Estado**: R414 en producción, IFE en desarrollo

## Objetivo

Esta herramienta permite a consultores y contadores generar automáticamente los archivos XBRL necesarios para reportar a la Superintendencia de Servicios Públicos Domiciliarios (SSPD), reduciendo el tiempo de trabajo de 8 horas a 2-3 horas por taxonomía.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 15 con App Router |
| Frontend | React 19 + TypeScript + Tailwind CSS 3.4 |
| UI | shadcn/ui + Radix UI + lucide-react |
| API | tRPC 11 (type-safe) |
| Base de Datos | PostgreSQL + Drizzle ORM |
| Excel | xlsx + exceljs |
| Compresión | jszip |
| Package Manager | pnpm |

## Inicio Rápido

```bash
# Clonar repositorio
git clone https://github.com/Ing-Eduardo-E/xbrl-generator.git
cd xbrl-generator/app

# Instalar dependencias
pnpm install

# Configurar base de datos
cp .env.example .env.local
# Editar .env.local con tu DATABASE_URL

# Crear tablas
pnpm db:push

# Iniciar desarrollo
pnpm dev

# Abrir http://localhost:3000
```

## Características

- **Interfaz de 3 pasos**: Cargar, Configurar, Generar
- **Procesamiento automático**: Lee balances consolidados en Excel y distribuye las cuentas por servicios
- **Validación contable**: Verifica que se cumplan las ecuaciones contables básicas
- **Generación de archivos**: Crea el paquete completo compatible con XBRL Express
- **Plantillas oficiales SSPD**: Usa las plantillas oficiales para 100% compatibilidad

## Taxonomías Soportadas

| Grupo | Nombre | Estado |
|-------|--------|--------|
| Grupo 1 | NIIF Plenas | Implementado |
| Grupo 2 | NIIF PYMES | Implementado |
| Grupo 3 | Microempresas | Implementado |
| R414 | Resolución 414 (Sector Público) | **En Producción** |
| IFE | Informe Financiero Trimestral | En Desarrollo |

## Cómo Usar

### Paso 1: Cargar Balance Consolidado

1. Selecciona el **Grupo NIIF** de tu empresa
2. Carga el archivo Excel con el balance consolidado:
   - Una hoja llamada "Consolidado" (o será la primera hoja)
   - Columnas: Código | Nombre de la Cuenta | Valor
   - Códigos PUC estándar

### Paso 2: Configurar Distribución

1. Define los servicios (Acueducto, Alcantarillado, Aseo)
2. Asigna un **porcentaje de distribución** a cada servicio
3. La suma de los porcentajes debe ser exactamente **100%**

**Ejemplo típico**:
- Acueducto: 40%
- Alcantarillado: 20%
- Aseo: 40%

### Paso 3: Generar y Descargar

1. Haz clic en **"Generar Taxonomía"**
2. Se descargará un archivo ZIP con:
   - Plantilla Excel oficial PRE-LLENADA
   - Archivo de mapeo XML
   - Plantilla XBRL (.xbrlt)
   - Instancia XBRL (.xbrl)

## Hojas Automatizadas (12 hojas)

| Código | Hoja | Descripción |
|--------|------|-------------|
| 110000 | Hoja1 | Información general |
| 210000 | Hoja2 | Estado de Situación Financiera |
| 310000 | Hoja3 | Estado de Resultados |
| 900017a | FC01-1 | Gastos Acueducto |
| 900017b | FC01-2 | Gastos Alcantarillado |
| 900017c | FC01-3 | Gastos Aseo |
| 900017g | FC01-7 | Gastos Total servicios |
| 900019 | FC02 | Complementario de ingresos |
| 900021 | FC03-1 | CXC Acueducto (por estrato) |
| 900022 | FC03-2 | CXC Alcantarillado (por estrato) |
| 900023 | FC03-3 | CXC Aseo (por estrato) |
| 900028b | FC05b | Pasivos por edades de vencimiento |

Esto representa aproximadamente el **85% del trabajo manual**.

## Próximos Pasos Después de Generar

1. Abre los archivos generados en **XBRL Express**
2. Completa las hojas restantes que requieren información manual
3. Ejecuta la **validación** en XBRL Express
4. Genera el archivo `.xbrl` final
5. **Certifica** en la plataforma SUI

## Comandos

```bash
# Desarrollo
pnpm dev              # Servidor en http://localhost:3000

# Base de Datos
pnpm db:push          # Aplicar schema
pnpm db:studio        # Abrir Drizzle Studio

# Producción
pnpm build            # Build
pnpm start            # Iniciar servidor
```

## Estructura del Proyecto

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # Componentes React
│   ├── lib/
│   │   ├── services/           # Excel parser/generator
│   │   ├── xbrl/               # Generación XBRL
│   │   └── trpc/               # Cliente tRPC
│   ├── db/schema/              # Schema Drizzle
│   └── server/routers/         # API tRPC
├── public/templates/           # Plantillas oficiales SSPD
└── docs/                       # Documentación
```

## Documentación

| Archivo | Descripción |
|---------|-------------|
| `CLAUDE.md` | Guía para Claude Code |
| `todo.md` | Estado de tareas |
| `docs/plan_refactorizacion_taxonomias.md` | Plan de refactorización |
| `docs/CONTINUIDAD_REFACTORIZACION.md` | Documento de continuidad |
| `docs/analisis_taxonomias_sspd.md` | Análisis de taxonomías |

## Refactorización en Progreso

El código está siendo refactorizado para separar cada taxonomía en archivos independientes.
Ver `docs/plan_refactorizacion_taxonomias.md` para detalles.

## Requisitos del Balance de Entrada

1. Estructura clara con columnas: Código, Nombre, Valor
2. Códigos PUC estándar:
   - 1xxx: Activos
   - 2xxx: Pasivos
   - 3xxx: Patrimonio
   - 4xxx: Ingresos
   - 5xxx-6xxx: Gastos
3. Ecuaciones contables balanceadas:
   - Activo = Pasivo + Patrimonio

## Limitaciones Conocidas

- Los porcentajes de distribución son fijos para todas las cuentas
- Los valores se redondean a enteros
- Solo procesa la hoja "Consolidado" o la primera hoja
- Validación final debe hacerse en XBRL Express

## Licencia

Prototipo MVP desarrollado para automatizar la generación de taxonomías XBRL para empresas de servicios públicos en Colombia.

---

**Desarrollado para simplificar el trabajo de consultores y contadores**
