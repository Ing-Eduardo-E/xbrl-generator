# XBRL Generator - Proyecto Nuevo (Desde Cero)

## 🎯 Objetivo del Proyecto

Aplicación web para automatizar la generación de taxonomías XBRL para empresas de servicios públicos colombianas que reportan a la SSPD.

### Flujo de Trabajo Principal

```
1. CARGA → Usuario sube Excel con Balance General Consolidado
2. VALIDACIÓN → Sistema verifica: Activos = Pasivos + Patrimonio
3. DISTRIBUCIÓN → Usuario define % para cada servicio (debe sumar 100%):
   - Acueducto
   - Alcantarillado
   - Aseo
4. GENERACIÓN → Sistema diligencia automáticamente hojas Excel según taxonomías SSPD
5. DESCARGA → Usuario descarga paquete Excel con todas las hojas completadas
```

---

## 📁 Estructura del Proyecto (Limpio)

```
xbrl-generator/
├── docs/                         ✅ CONSERVADO - Documentación técnica
├── documentos/                   ✅ CONSERVADO - Archivos de referencia
├── proyecto_anterior_completo/   ✅ BACKUP - Código anterior completo
├── .git/                         ✅ CONSERVADO - Historial de git
├── .gitignore                    ✅ CONSERVADO - Configuración git
├── CLAUDE.md                     ✅ CONSERVADO - Guía para Claude
├── DOCUMENTACION.md              ✅ CONSERVADO - Documentación del proyecto
├── PLAN_REORGANIZACION.md        ✅ CONSERVADO - Plan de migración
├── README.md                     ✅ CONSERVADO - README original
├── todo.md                       ✅ CONSERVADO - Lista de tareas
└── README_NUEVO_PROYECTO.md      📝 NUEVO - Este archivo
```

**TODO LO DEMÁS FUE MOVIDO A**: `proyecto_anterior_completo/`

---

## 🗂️ Archivos Reutilizables en `/docs`

Los siguientes documentos contienen información valiosa que usaremos:

### Documentación Técnica
- `docs/estructura_puc_colombia.md` - Estructura del Plan Único de Cuentas
- `docs/analisis_taxonomias_sspd.md` - Análisis de taxonomías oficiales SSPD
- `docs/informe_analisis_xbrl.md` - Informe completo de análisis XBRL
- `docs/validacion_compatibilidad.md` - Validaciones necesarias

### Arquitectura y Requisitos
- `docs/especificacion_requisitos_webapp.md` - Requisitos funcionales
- `docs/especificacion_tecnica_simplificada.md` - Especificación técnica
- `docs/arquitectura_solucion_xbrl_web.md` - Arquitectura propuesta
- `docs/arquitectura_simplificada_sin_bd.md` - Arquitectura alternativa

### Flujos de Trabajo
- `docs/flujo_trabajo_actual.md` - Proceso manual actual
- `docs/flujo_usuario_optimizado.md` - Flujo optimizado propuesto
- `docs/alcance_automatizacion_actualizado.md` - Alcance de automatización

### Análisis Comparativo
- `docs/analisis_comparativo_niif.md` - Comparación grupos NIIF

---

## 🎨 Stack Tecnológico Propuesto (Nuevo)

### Opción Recomendada: Next.js Full-Stack

```typescript
Frontend:
- Next.js 15 (App Router)
- React 19
- TypeScript 5.9+ (strict mode)
- Tailwind CSS 4
- shadcn/ui
- TanStack Query
- React Hook Form + Zod

Backend:
- Next.js API Routes / Server Actions
- tRPC (type-safe API)
- Drizzle ORM
- PostgreSQL / SQLite (desarrollo)

Excel Processing:
- xlsx (SheetJS)
- Archiver (ZIP generation)

Validación:
- Zod schemas
- Custom validators para PUC

Testing:
- Vitest
- Playwright (E2E)
- Testing Library

Dev Tools:
- pnpm (package manager)
- ESLint + Prettier
- Husky (git hooks)
```

### Ventajas de Next.js

✅ **DX Excelente**: File-based routing, Server Components, Server Actions
✅ **Type-Safety Total**: TypeScript + tRPC + Zod end-to-end
✅ **Menos Configuración**: Vite, Webpack, routing todo integrado
✅ **Performance**: Server Components, streaming, optimizaciones automáticas
✅ **Deploy Sencillo**: Vercel, Railway, Docker fácil
✅ **Ecosistema Moderno**: Mejor soporte, actualizaciones frecuentes

---

## 🚀 Siguiente Paso: Inicializar Proyecto

### Comando para Crear Proyecto Nuevo

```bash
pnpm create next-app@latest xbrl-app --typescript --tailwind --app --src-dir --import-alias "@/*"
```

### Estructura Propuesta del Nuevo Proyecto

```
xbrl-app/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Grupo de rutas autenticadas
│   │   ├── (public)/            # Grupo de rutas públicas
│   │   ├── api/                 # API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── balance/             # Componentes de balance
│   │   ├── distribution/        # Componentes de distribución
│   │   └── xbrl/               # Componentes XBRL
│   ├── lib/
│   │   ├── db/                  # Database client
│   │   ├── excel/              # Excel processing
│   │   ├── validation/         # Validadores
│   │   └── xbrl/              # Lógica XBRL
│   ├── server/
│   │   ├── routers/            # tRPC routers
│   │   └── procedures/         # tRPC procedures
│   └── types/                   # TypeScript types
├── public/
│   └── templates/              # Plantillas Excel SSPD
├── drizzle/
│   ├── schema/
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 📋 Tareas Inmediatas

### Fase 1: Setup Inicial
- [ ] Crear proyecto Next.js con configuración base
- [ ] Instalar dependencias (tRPC, Drizzle, xlsx, shadcn)
- [ ] Configurar TypeScript en modo strict
- [ ] Configurar Tailwind + shadcn/ui
- [ ] Configurar base de datos (PostgreSQL local con Docker)

### Fase 2: Core Features
- [ ] Módulo de carga de Excel
- [ ] Parser de balance general
- [ ] Validación contable (Activos = Pasivos + Patrimonio)
- [ ] UI de distribución por servicios
- [ ] Lógica de distribución proporcional

### Fase 3: XBRL Generation
- [ ] Mapear estructura PUC → Taxonomías SSPD
- [ ] Integrar plantillas Excel oficiales
- [ ] Generar hojas Excel diligenciadas
- [ ] Empaquetar archivos para descarga

### Fase 4: Polish & Deploy
- [ ] Tests unitarios y E2E
- [ ] Manejo de errores robusto
- [ ] Documentación de usuario
- [ ] Deploy a producción

---

## 🎓 Conocimiento del Dominio

### Plan Único de Cuentas (PUC)

**Jerarquía**:
- 1 dígito → Clase (1=Activos, 2=Pasivos, 3=Patrimonio, 4=Ingresos, 5=Gastos, 6=Costos)
- 2 dígitos → Grupo
- 4 dígitos → Cuenta
- 6 dígitos → Subcuenta
- 7+ dígitos → Auxiliares

**Ejemplo**:
```
1       → Activos (Clase)
11      → Disponible (Grupo)
1105    → Caja (Cuenta)
110505  → Caja General (Subcuenta)
11050501 → Caja General Oficina Principal (Auxiliar)
```

### Grupos NIIF

| Grupo | Empresas | Hojas Excel | Complejidad |
|-------|----------|-------------|-------------|
| Grupo 1 | NIIF Plenas | 66 | Muy Alta |
| Grupo 2 | NIIF PYMES | 45 | Alta |
| Grupo 3 | Microempresas | 30 | Media |
| R414 | ESAL | 43 | Media |

### Servicios Públicos

1. **Acueducto** - Suministro de agua potable
2. **Alcantarillado** - Recolección y tratamiento aguas residuales
3. **Aseo** - Recolección y disposición de residuos sólidos

---

## 🔗 Referencias

- **SSPD**: https://www.superservicios.gov.co/
- **SUI**: https://www.sui.gov.co/
- **Taxonomías XBRL**: Disponibles en SUI
- **Docs Anteriores**: `/docs` y `/proyecto_anterior_completo`

---

**Fecha de Inicio**: 2024-11-24
**Autor**: Proyecto recreado desde cero con mejores prácticas
**Versión**: 2.0.0
