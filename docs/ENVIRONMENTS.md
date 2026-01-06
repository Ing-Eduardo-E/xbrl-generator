# Configuración de Entornos

Este documento describe cómo configurar y gestionar los diferentes entornos del proyecto.

## Resumen de Entornos

| Entorno | Base de Datos | Despliegue | Branch Git |
|---------|---------------|------------|------------|
| **Producción** | Neon (`main` branch) | Vercel | `main` |
| **Desarrollo** | Neon (`development` branch) | localhost:3000 | `*` |

## Neon PostgreSQL

Usamos [Neon](https://neon.tech) como proveedor de PostgreSQL serverless con branches para separar entornos.

### Estructura de Branches en Neon

```
neondb (proyecto)
├── main          → Producción (Vercel)
└── development   → Desarrollo local
```

### Crear Branch de Desarrollo

1. Accede a [console.neon.tech](https://console.neon.tech)
2. Selecciona el proyecto `neondb`
3. Ve a **Branches** → **Create Branch**
4. Nombre: `development`, Parent: `main`
5. Copia la connection string

## Configuración Local

### Archivo `.env.local`

Crea el archivo `app/.env.local` con:

```env
# Desarrollo - Branch de Neon
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx-development.neon.tech/neondb?sslmode=require

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Comandos

```bash
# Navegar al directorio de la app
cd app

# Instalar dependencias
pnpm install

# Sincronizar schema con la BD de desarrollo
pnpm db:push

# Iniciar servidor de desarrollo
pnpm dev

# Abrir Drizzle Studio (GUI de BD)
pnpm db:studio
```

## Configuración de Producción (Vercel)

Las variables de producción se configuran en Vercel Dashboard:

1. Ve a [vercel.com](https://vercel.com) → Tu proyecto
2. **Settings** → **Environment Variables**
3. Configura:
   - `DATABASE_URL`: Connection string del branch `main` de Neon
   - `NEXT_PUBLIC_APP_URL`: URL de producción

### Variables en Vercel

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | `https://tu-app.vercel.app` |

## Flujo de Trabajo Recomendado

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Desarrollo    │────▶│   Git Push      │────▶│   Producción    │
│   (localhost)   │     │   (GitHub)      │     │   (Vercel)      │
│   Neon: dev     │     │                 │     │   Neon: main    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Desarrolla** en local con el branch `development` de Neon
2. **Prueba** los cambios localmente
3. **Commit & Push** a GitHub
4. **Vercel** despliega automáticamente usando el branch `main` de Neon

## Migraciones de Base de Datos

### Desarrollo

```bash
# Aplicar cambios al schema
pnpm db:push
```

### Producción

Para aplicar migraciones en producción:

1. Genera la migración localmente:
   ```bash
   pnpm db:generate
   ```

2. Conecta temporalmente a producción (con cuidado):
   ```bash
   # En .env.local, cambiar temporalmente a la URL de producción
   pnpm db:migrate
   ```

   O ejecuta la migración desde Vercel/Neon directamente.

## Seguridad

- ⚠️ **Nunca** commitear `.env.local` (está en `.gitignore`)
- ⚠️ **Nunca** usar la BD de producción para desarrollo
- ✅ Usar branches de Neon para aislar datos
- ✅ Configurar variables de producción solo en Vercel Dashboard

## Troubleshooting

### Error: "relation does not exist"

Las tablas no existen. Ejecuta:
```bash
pnpm db:push
```

### Error: "ENOTFOUND"

La URL de conexión es incorrecta. Verifica:
1. Que `.env.local` existe
2. Que `DATABASE_URL` tiene el formato correcto
3. Que el branch de Neon existe y está activo

### Error: "authentication failed"

La contraseña es incorrecta. Regenera la contraseña en Neon:
1. Ve al proyecto en Neon
2. **Connection Details** → **Reset Password**
3. Actualiza `.env.local`
