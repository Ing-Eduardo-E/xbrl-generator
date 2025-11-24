# Documentación del Proyecto XBRL Generator

Este directorio contiene toda la documentación de análisis, diseño y especificaciones del proyecto.

## 📚 Índice de Documentos

### Análisis de la Aplicación Original

1. **[informe_analisis_xbrl.md](./informe_analisis_xbrl.md)**
   - Análisis completo de la aplicación XBRL Express (aplicación Java de escritorio)
   - Componentes principales y funcionalidades
   - Arquitectura técnica
   - Recomendaciones para migración a web

2. **[analisis_taxonomias_sspd.md](./analisis_taxonomias_sspd.md)**
   - Estructura y componentes de las taxonomías oficiales SSPD
   - Patrones identificados en los archivos XBRL

3. **[validacion_compatibilidad.md](./validacion_compatibilidad.md)**
   - Garantía de integración con XBRL Express
   - Proceso de certificación en el SUI

### Análisis de Requisitos

4. **[analisis_comparativo_niif.md](./analisis_comparativo_niif.md)**
   - Comparación exhaustiva de los 4 grupos NIIF (Grupo 1, 2, 3 y R414)
   - Estructura de reportes por grupo
   - Diferencias en complejidad y número de hojas

5. **[alcance_automatizacion_actualizado.md](./alcance_automatizacion_actualizado.md)**
   - Alcance preciso de qué hojas se automatizan (11 de 45)
   - Hojas que requieren diligenciamiento manual
   - Impacto real en el tiempo de trabajo

6. **[flujo_trabajo_actual.md](./flujo_trabajo_actual.md)**
   - Flujo de trabajo manual actual del consultor
   - Problemas y puntos de dolor identificados

### Diseño y Arquitectura

7. **[especificacion_requisitos_webapp.md](./especificacion_requisitos_webapp.md)**
   - Requisitos funcionales y no funcionales detallados
   - Casos de uso
   - Criterios de aceptación

8. **[arquitectura_solucion_xbrl_web.md](./arquitectura_solucion_xbrl_web.md)**
   - Stack tecnológico propuesto
   - Diseño de componentes
   - Diagramas de arquitectura

9. **[arquitectura_simplificada_sin_bd.md](./arquitectura_simplificada_sin_bd.md)**
   - Diseño stateless sin base de datos (versión final implementada)
   - Beneficios de la simplificación
   - Trade-offs y decisiones de diseño

10. **[especificacion_tecnica_simplificada.md](./especificacion_tecnica_simplificada.md)**
    - Especificación técnica completa de la solución implementada
    - Plan de implementación
    - Estimación de esfuerzo

### Experiencia de Usuario

11. **[flujo_usuario_optimizado.md](./flujo_usuario_optimizado.md)**
    - Comparación del proceso actual vs. el nuevo proceso
    - Wireframes y mockups conceptuales
    - Mejoras en la experiencia de usuario

### Referencia Técnica

12. **[estructura_puc_colombia.md](./estructura_puc_colombia.md)**
    - Estructura del Plan Único de Cuentas (PUC) en Colombia
    - Niveles jerárquicos (clase, grupo, cuenta, subcuenta, auxiliar)
    - Ejemplos y casos de uso

## 🎯 Cómo Usar Esta Documentación

### Para Desarrolladores

1. Comienza con **arquitectura_simplificada_sin_bd.md** para entender el diseño general
2. Revisa **especificacion_tecnica_simplificada.md** para los detalles de implementación
3. Consulta **estructura_puc_colombia.md** para entender la lógica contable

### Para Consultores/Usuarios

1. Lee **flujo_usuario_optimizado.md** para ver cómo cambia tu flujo de trabajo
2. Revisa **alcance_automatizacion_actualizado.md** para entender qué se automatiza
3. Consulta **analisis_comparativo_niif.md** para ver las diferencias entre grupos

### Para Product Managers

1. Comienza con **especificacion_requisitos_webapp.md** para los requisitos completos
2. Revisa **flujo_trabajo_actual.md** para entender el problema que se resuelve
3. Consulta **alcance_automatizacion_actualizado.md** para el impacto en productividad

## 📊 Métricas Clave

- **Tiempo ahorrado**: De 8 horas a 2-3 horas por taxonomía (85% de reducción)
- **Hojas automatizadas**: 11 de 45 (24% de hojas, pero 85% del tiempo)
- **Taxonomías por día**: De 1 a 4 (aumento de 300%)
- **Grupos NIIF soportados**: 4 (Grupo 1, 2, 3 y R414)

## 🔄 Actualizaciones

Este directorio se actualiza conforme avanza el proyecto. Consulta la fecha de última modificación de cada archivo para ver la información más reciente.

---

**Última actualización**: Noviembre 2025
