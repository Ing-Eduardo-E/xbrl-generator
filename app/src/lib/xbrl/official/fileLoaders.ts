/**
 * Carga de archivos de template XBRL con cache LRU por mtime.
 * Extraído de officialTemplateService.ts (L974–1061).
 */
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Obtiene la ruta base de plantillas
 */
function getTemplatesBasePath(): string {
  // En Next.js, public está en la raíz del proyecto
  return path.join(process.cwd(), 'public', 'templates');
}

const SAFE_TEMPLATE_PATH_RE = /^[a-zA-Z0-9/_\-]+\.(xbrlt?|xml|xlsx)$/;

// Cache LRU para templates: clave = ruta absoluta, invalida por mtime
const _templateCache = new Map<string, { content: string; mtime: number; cachedAt: number }>();
const _binaryCache = new Map<string, { content: Buffer; mtime: number; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Carga y lee una plantilla oficial
 */
export async function loadTemplate(relativePath: string): Promise<string> {
  if (!SAFE_TEMPLATE_PATH_RE.test(relativePath)) {
    throw new Error(`Invalid template path: ${relativePath}`);
  }
  const fullPath = path.join(getTemplatesBasePath(), relativePath);
  try {
    const stat = await fs.stat(fullPath);
    const mtime = stat.mtimeMs;
    const now = Date.now();
    const cached = _templateCache.get(fullPath);
    if (cached && cached.mtime === mtime && now - cached.cachedAt < CACHE_TTL_MS) {
      return cached.content;
    }
    const content = await fs.readFile(fullPath, 'utf-8');
    _templateCache.set(fullPath, { content, mtime, cachedAt: now });
    return content;
  } catch (error) {
    console.error(`Error cargando plantilla ${fullPath}:`, error);
    throw new Error(`No se pudo cargar la plantilla: ${relativePath}`);
  }
}

/**
 * Carga un archivo binario (xlsx)
 */
export async function loadBinaryTemplate(relativePath: string): Promise<Buffer> {
  if (!SAFE_TEMPLATE_PATH_RE.test(relativePath)) {
    throw new Error(`Invalid template path: ${relativePath}`);
  }
  const fullPath = path.join(getTemplatesBasePath(), relativePath);
  try {
    const stat = await fs.stat(fullPath);
    const mtime = stat.mtimeMs;
    const now = Date.now();
    const cached = _binaryCache.get(fullPath);
    if (cached && cached.mtime === mtime && now - cached.cachedAt < CACHE_TTL_MS) {
      return cached.content;
    }
    const content = await fs.readFile(fullPath);
    _binaryCache.set(fullPath, { content, mtime, cachedAt: now });
    return content;
  } catch (error) {
    console.error(`Error cargando plantilla binaria ${fullPath}:`, error);
    throw new Error(`No se pudo cargar la plantilla binaria: ${relativePath}`);
  }
}

/**
 * Obtiene la etiqueta del grado de redondeo según el código
 */
export function getRoundingDegreeLabel(degree: string | undefined): string {
  const labels: Record<string, string> = {
    '1': '1 - Pesos',
    '2': '2 - Miles de pesos',
    '3': '3 - Millones de pesos',
    '4': '4 - Pesos redondeada a miles',
  };
  return labels[degree || '1'] || '1 - Pesos';
}
