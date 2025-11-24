# Estructura del Plan Único de Cuentas (PUC) en Colombia

## Niveles Jerárquicos

Según la investigación en fuentes oficiales colombianas, el PUC está estructurado en los siguientes niveles:

| Nivel | Dígitos | Ejemplo | Descripción |
|:---|:---|:---|:---|
| **Clase** | 1 dígito | `1` | Activo, Pasivo, Patrimonio, Ingresos, Gastos, etc. |
| **Grupo** | 2 dígitos | `11` | Efectivo y equivalentes al efectivo |
| **Cuenta** | 4 dígitos | `1105` | Caja |
| **Subcuenta** | 6 dígitos | `110501` | Caja principal |
| **Auxiliar** | 7+ dígitos | `11050101` | Caja principal - Sede principal |

## Clases del PUC

- **Clase 1**: Activo
- **Clase 2**: Pasivo
- **Clase 3**: Patrimonio
- **Clase 4**: Ingresos
- **Clase 5**: Gastos
- **Clase 6**: Costos de ventas
- **Clase 7**: Costos de producción o de operación
- **Clase 8**: Cuentas de orden deudoras
- **Clase 9**: Cuentas de orden acreedoras

## Regla de Suma

**IMPORTANTE**: En contabilidad, los totales se calculan sumando **únicamente las cuentas de nivel más bajo** (hojas del árbol contable) que tengan valores registrados.

Los niveles superiores (Clase, Grupo, Cuenta) son **subtotales calculados** que agrupan las cuentas inferiores. Si se suman todos los niveles, se produce **doble, triple o cuádruple contabilización**.

### Ejemplo Práctico

```
1     ACTIVOS                    = 65,921,694.55  ← SUBTOTAL (NO SUMAR)
  11    EFECTIVO                 = 22,922,334.55  ← SUBTOTAL (NO SUMAR)
    1105  CAJA                   =          0.00  ← SUBTOTAL (NO SUMAR)
      110501  Caja principal     =          0.00  ← HOJA (SUMAR)
      110502  Caja menor         =          0.00  ← HOJA (SUMAR)
    1110  DEPÓSITOS              = 22,922,334.55  ← SUBTOTAL (NO SUMAR)
      111005  Cuenta corriente   = 13,804,877.55  ← HOJA (SUMAR)
      111006  Cuenta de ahorro   =  9,117,457.00  ← HOJA (SUMAR)
```

**Suma correcta**: 0 + 0 + 13,804,877.55 + 9,117,457.00 = 22,922,334.55

**Suma incorrecta** (incluyendo subtotales): 65,921,694.55 + 22,922,334.55 + 0 + 0 + 0 + 22,922,334.55 + 13,804,877.55 + 9,117,457.00 = **DOBLE CONTABILIZACIÓN**

## Estrategia de Implementación

Para identificar correctamente las cuentas "hoja" (sin hijos):

1. **Leer todas las cuentas** del archivo Excel
2. **Identificar cuáles tienen subcuentas** debajo (comparando códigos)
3. **Filtrar para mantener solo las hojas** (cuentas que NO tienen otras cuentas que empiecen con su código)
4. **Sumar solo las hojas**

Esta estrategia es **independiente del número de dígitos**, ya que en la práctica:
- Algunas empresas usan solo hasta subcuentas (6 dígitos)
- Otras usan auxiliares (7+ dígitos)
- Algunas cuentas pueden no tener subdivisiones

La clave es identificar **dinámicamente** cuáles son las hojas del árbol, no asumir un número fijo de dígitos.
