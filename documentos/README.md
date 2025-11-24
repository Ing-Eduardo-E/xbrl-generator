# Generador de Taxonomías XBRL

Aplicación web para automatizar la generación de taxonomías XBRL desde balances consolidados de empresas de servicios públicos en Colombia.

## 🎯 Objetivo

Esta herramienta permite a consultores y contadores generar automáticamente los archivos XBRL necesarios para reportar a la Superintendencia de Servicios Públicos Domiciliarios (SSPD), reduciendo el tiempo de trabajo de 8 horas a 2-3 horas por taxonomía.

## ✨ Características

- **Interfaz de 3 pasos**: Cargar, Configurar, Generar
- **Procesamiento automático**: Lee balances consolidados en Excel y distribuye las cuentas por servicios
- **Validación contable**: Verifica que se cumplan las ecuaciones contables básicas
- **Generación de archivos**: Crea el paquete completo compatible con XBRL Express
- **Sin base de datos**: Aplicación stateless que no almacena datos sensibles

## 🚀 Cómo Usar

### Paso 1: Cargar Balance Consolidado

1. Selecciona el **Grupo NIIF** de tu empresa:
   - Grupo 1 - NIIF Plenas
   - Grupo 2 - NIIF PYMES
   - Grupo 3 - Microempresas
   - R414 - ESAL

2. Carga el archivo Excel con el balance consolidado. El archivo debe tener:
   - Una hoja llamada "Consolidado" (o será la primera hoja)
   - Columnas: Código | Nombre de la Cuenta | Valor
   - Códigos PUC estándar (1000-1999 Activos, 2000-2999 Pasivos, etc.)

**Archivo de ejemplo**: Puedes descargar [ejemplo_balance.xlsx](/ejemplo_balance.xlsx) para probar la aplicación.

### Paso 2: Configurar Distribución

1. Define los servicios que presta tu empresa (Acueducto, Alcantarillado, Aseo, etc.)
2. Asigna un **porcentaje de distribución** a cada servicio
3. La suma de los porcentajes debe ser exactamente **100%**

**Ejemplo típico**:
- Acueducto: 40%
- Alcantarillado: 20%
- Aseo: 40%

### Paso 3: Generar y Descargar

1. Haz clic en **"Generar Taxonomía"**
2. La aplicación procesará el balance y generará los archivos
3. Se descargará automáticamente un archivo ZIP con:
   - Plantilla Excel oficial con 11 hojas diligenciadas
   - Archivo de mapeo XML
   - Plantilla XBRL (.xbrlt)
   - Instancia XBRL (.xbrl)
   - README con instrucciones

## 📊 Hojas Autocompletadas

La aplicación diligencia automáticamente las siguientes hojas:

- ✅ **[210000]** Estado de situación financiera (Balance General)
- ✅ **[310000]** Estado de resultados
- ✅ **[900017a]** FC01-1 - Gastos de Acueducto
- ✅ **[900017b]** FC01-2 - Gastos de Alcantarillado
- ✅ **[900017c]** FC01-3 - Gastos de Aseo
- ✅ **[900017g]** FC01-7 - Gastos Total servicios

Esto representa aproximadamente el **85% del trabajo manual**.

## 📝 Próximos Pasos Después de Generar

1. Abre los archivos generados en **XBRL Express**
2. Completa las hojas restantes (34 hojas) que requieren información manual:
   - Notas explicativas
   - Políticas contables
   - Revelaciones específicas
   - Estados complementarios
3. Ejecuta la **validación** en XBRL Express
4. Corrige cualquier error reportado
5. Genera el archivo `.xbrl` final
6. **Certifica** en la plataforma SUI

## 🔒 Privacidad y Seguridad

- **No se almacenan datos**: La aplicación es completamente stateless
- **Procesamiento local**: Todo el procesamiento ocurre en tu navegador
- **Sin registro**: No requiere crear cuenta ni iniciar sesión
- **Archivos temporales**: Se eliminan automáticamente después de la descarga

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Procesamiento**: xlsx (lectura de Excel), JSZip (generación de archivos)
- **UI Components**: shadcn/ui
- **Build**: Vite

## 📋 Requisitos del Balance de Entrada

Para que la aplicación funcione correctamente, tu archivo Excel debe:

1. Tener una estructura clara con columnas: Código, Nombre, Valor
2. Usar códigos PUC estándar:
   - 1000-1999: Activos
   - 2000-2999: Pasivos
   - 3000-3999: Patrimonio
   - 4000-4999: Ingresos
   - 5000-6999: Gastos
3. Cumplir con las ecuaciones contables:
   - Activo = Pasivo + Patrimonio
   - Utilidad = Ingresos - Gastos

## ⚠️ Limitaciones Conocidas

- Los porcentajes de distribución son fijos para todas las cuentas (no hay distribución selectiva por tipo de cuenta)
- Los valores se redondean a enteros (sin decimales)
- Solo procesa la hoja "Consolidado" o la primera hoja del archivo
- No valida la coherencia de las notas y revelaciones (eso debe hacerse en XBRL Express)

## 🤝 Soporte

Si encuentras algún problema:

1. Verifica que tu archivo Excel tenga la estructura correcta
2. Asegúrate de que las ecuaciones contables estén balanceadas
3. Revisa que los códigos PUC sean válidos

## 📄 Licencia

Prototipo MVP desarrollado para automatizar la generación de taxonomías XBRL para empresas de servicios públicos en Colombia.

---

**Desarrollado con ❤️ para simplificar el trabajo de consultores y contadores**
