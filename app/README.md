# XBRL Generator v2.0

Generador automático de taxonomías XBRL para empresas de servicios públicos colombianas que reportan a la SSPD.

## 🚀 Proyecto Nuevo - Creado desde Cero

Este es un proyecto completamente nuevo, construido con las mejores prácticas modernas. Todo el código anterior fue movido a `../proyecto_anterior_completo/`.

## 🎯 Objetivo

Automatizar la generación de taxonomías XBRL reduciendo el tiempo de preparación de 8 horas a 2-3 horas (85% de ahorro).

### Flujo de Trabajo

```
1. CARGA → Usuario sube Excel con Balance General Consolidado
2. VALIDACIÓN → Sistema verifica: Activos = Pasivos + Patrimonio ✅
3. DISTRIBUCIÓN → Usuario define % para:
   - Acueducto
   - Alcantarillado
   - Aseo
   (Debe sumar 100%)
4. GENERACIÓN → Sistema diligencia hojas Excel según taxonomías SSPD
5. DESCARGA → Usuario descarga paquete completo
```

## 🛠️ Stack Tecnológico

- **Next.js 16** - Framework React con App Router
- **React 19** - UI Library
- **TypeScript 5.9** - Type Safety (Strict Mode)
- **Tailwind CSS 4** - Styling con tema personalizado
- **Turbopack** - Build tool ultra-rápido
- **pnpm** - Package manager

### Por Implementar

- **tRPC** - API type-safe
- **Drizzle ORM** - Base de datos
- **PostgreSQL** - Database
- **Zod** - Validación de schemas
- **xlsx** - Procesamiento de Excel
- **Vitest** - Testing
- **Playwright** - E2E testing

## 📁 Estructura del Proyecto

```
app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout principal
│   │   └── page.tsx            # Página home
│   ├── components/
│   │   └── ui/                 # Componentes UI (shadcn)
│   ├── lib/                    # Utilidades y configuración
│   ├── styles/
│   │   └── globals.css         # Estilos globales + Tailwind
│   └── types/                  # TypeScript types
├── public/                     # Assets estáticos
├── next.config.ts             # Configuración Next.js
├── tsconfig.json              # TypeScript config (strict mode)
├── package.json               # Dependencies
└── README.md                  # Este archivo
```

## 🚦 Comandos

```bash
# Desarrollo
pnpm dev          # Inicia servidor en http://localhost:3000 con Turbopack

# Producción
pnpm build        # Compila para producción
pnpm start        # Inicia servidor de producción

# Calidad de código
pnpm lint         # ESLint
pnpm type-check   # TypeScript check sin compilar
```

## 🎨 Características del Proyecto

### TypeScript Strict Mode

Configuración estricta de TypeScript para prevenir errores:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true,
  "noUncheckedIndexedAccess": true,
  ...
}
```

### Tailwind CSS 4

Usando la nueva sintaxis `@theme` con colores OKLCH para mejor percepción visual:

```css
@theme {
  --color-primary: oklch(60% 0.25 250);
  --color-secondary: oklch(70% 0.15 200);
  ...
}
```

### Next.js 16 con Turbopack

- **Turbopack**: Build incremental ultra-rápido (700x más rápido que Webpack)
- **App Router**: File-based routing moderno
- **Server Components**: Mejor performance por defecto
- **Typed Routes**: Rutas type-safe

## 🗂️ Conocimiento del Dominio

### Plan Único de Cuentas (PUC)

Jerarquía de cuentas colombiana:

```
1 dígito  → Clase (1=Activos, 2=Pasivos, 3=Patrimonio, etc.)
2 dígitos → Grupo
4 dígitos → Cuenta
6 dígitos → Subcuenta
7+ dígitos → Auxiliares
```

### Grupos NIIF

| Grupo | Empresas | Hojas | Complejidad |
|-------|----------|-------|-------------|
| Grupo 1 | NIIF Plenas | 66 | Muy Alta |
| Grupo 2 | NIIF PYMES | 45 | Alta |
| Grupo 3 | Microempresas | 30 | Media |
| R414 | ESAL | 43 | Media |

### Servicios Públicos

1. **Acueducto** - Suministro de agua potable
2. **Alcantarillado** - Recolección y tratamiento de aguas residuales
3. **Aseo** - Recolección y disposición de residuos sólidos

## 📋 Próximos Pasos

### Fase 1: Setup Base (Completado ✅)
- [x] Crear proyecto Next.js
- [x] Configurar TypeScript strict mode
- [x] Configurar Tailwind CSS 4
- [x] Estructura de directorios
- [x] Página home básica

### Fase 2: Core Features (En Progreso)
- [ ] Instalar y configurar shadcn/ui
- [ ] Crear componente de carga de archivos
- [ ] Implementar parser de Excel (xlsx)
- [ ] Validación contable (Activos = Pasivos + Patrimonio)
- [ ] UI de distribución por servicios
- [ ] Lógica de distribución proporcional

### Fase 3: XBRL Generation
- [ ] Setup tRPC + Drizzle + PostgreSQL
- [ ] Mapear PUC → Taxonomías SSPD
- [ ] Integrar plantillas Excel oficiales
- [ ] Generar hojas Excel diligenciadas
- [ ] Empaquetar archivos para descarga

### Fase 4: Testing & Deploy
- [ ] Tests unitarios (Vitest)
- [ ] Tests E2E (Playwright)
- [ ] CI/CD (GitHub Actions)
- [ ] Deploy a producción (Vercel/Railway)

## 📚 Documentación Adicional

Ver `/docs` en el directorio raíz del proyecto para:

- Análisis de taxonomías SSPD
- Estructura del PUC colombiano
- Especificaciones técnicas
- Arquitectura de la solución
- Flujos de trabajo

## 🔗 Referencias

- **SSPD**: https://www.superservicios.gov.co/
- **SUI**: https://www.sui.gov.co/
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS 4**: https://tailwindcss.com/docs

## 📝 Notas

- El código anterior está en `../proyecto_anterior_completo/`
- Este es un proyecto completamente nuevo desde cero
- Stack moderno con mejores prácticas
- TypeScript estricto para prevenir errores
- Performance optimizada desde el diseño

---

**Versión**: 2.0.0
**Fecha de Inicio**: 2024-11-24
**Estado**: En desarrollo activo
