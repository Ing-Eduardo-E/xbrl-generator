import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, cuentasTrabajo, InsertCuentaTrabajo, CuentaTrabajo, balancesServicio, InsertBalanceServicio, BalanceServicio } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Vacía la tabla cuentas_trabajo (TRUNCATE).
 * Se llama automáticamente antes de cargar un nuevo archivo Excel.
 */
export async function truncateCuentasTrabajo(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    await db.execute(sql`TRUNCATE TABLE cuentas_trabajo`);
  } catch (error) {
    console.error("[Database] Failed to truncate cuentas_trabajo:", error);
    throw error;
  }
}

/**
 * Inserta múltiples cuentas en la tabla cuentas_trabajo.
 */
export async function insertCuentasTrabajo(cuentas: InsertCuentaTrabajo[]): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    if (cuentas.length > 0) {
      await db.insert(cuentasTrabajo).values(cuentas);
    }
  } catch (error) {
    console.error("[Database] Failed to insert cuentas:", error);
    throw error;
  }
}

/**
 * Marca las cuentas "hoja" (sin subcuentas) usando SQL.
 * Una cuenta es "hoja" si no existe ninguna otra cuenta cuyo código comience con el código de esta cuenta
 * y tenga mayor longitud.
 */
export async function marcarCuentasHoja(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    // Primero marcar todas como NO hoja
    await db.execute(sql`UPDATE cuentas_trabajo SET es_hoja = 0`);
    
    // Luego marcar como hoja las que NO tienen subcuentas
    await db.execute(sql`
      UPDATE cuentas_trabajo c1
      SET es_hoja = 1
      WHERE NOT EXISTS (
        SELECT 1 FROM cuentas_trabajo c2
        WHERE c2.codigo LIKE CONCAT(c1.codigo, '%')
        AND c2.longitud > c1.longitud
      )
    `);
  } catch (error) {
    console.error("[Database] Failed to mark leaf accounts:", error);
    throw error;
  }
}

/**
 * Obtiene todas las cuentas hoja.
 */
export async function getCuentasHoja(): Promise<CuentaTrabajo[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const result = await db.select().from(cuentasTrabajo).where(eq(cuentasTrabajo.esHoja, 1));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get leaf accounts:", error);
    throw error;
  }
}

/**
 * Calcula totales por clase de cuenta (primer dígito).
 * Retorna un objeto con las sumas de activos, pasivos, patrimonio, ingresos, gastos y costos.
 */
export async function calcularTotalesPorClase(): Promise<{
  activos: number;
  pasivos: number;
  patrimonio: number;
  ingresos: number;
  gastos: number;
  costos: number;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    // Sumar solo las cuentas hoja agrupadas por el primer dígito
    const result = await db.execute(sql`
      SELECT 
        LEFT(codigo, 1) as clase,
        SUM(valor) as total
      FROM cuentas_trabajo
      WHERE es_hoja = 1
      GROUP BY LEFT(codigo, 1)
    `);
    
    const totales = {
      activos: 0,
      pasivos: 0,
      patrimonio: 0,
      ingresos: 0,
      gastos: 0,
      costos: 0,
    };
    
    // Mapear resultados según la clasificación PUC colombiano
    // El resultado de db.execute() en mysql2 tiene la estructura [rows, fields]
    const rows = Array.isArray(result) && result.length > 0 ? result[0] : [];
    
    for (const row of rows as any[]) {
      const clase = row.clase;
      const total = Number(row.total) || 0;
      
      switch (clase) {
        case '1':
          totales.activos = total;
          break;
        case '2':
          totales.pasivos = total;
          break;
        case '3':
          totales.patrimonio = total;
          break;
        case '4':
          totales.ingresos = total;
          break;
        case '5':
          totales.gastos = total;
          break;
        case '6':
          totales.costos = total;
          break;
      }
    }
    
    return totales;
  } catch (error) {
    console.error("[Database] Failed to calculate totals:", error);
    throw error;
  }
}

/**
 * Obtiene todas las cuentas (para depuración).
 */
export async function getAllCuentas(): Promise<CuentaTrabajo[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const result = await db.select().from(cuentasTrabajo);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get all accounts:", error);
    throw error;
  }
}

/**
 * Vacía la tabla balances_servicio (TRUNCATE).
 */
export async function truncateBalancesServicio(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    await db.execute(sql`TRUNCATE TABLE balances_servicio`);
  } catch (error) {
    console.error("[Database] Failed to truncate balances_servicio:", error);
    throw error;
  }
}

/**
 * Distribuye las cuentas de trabajo entre servicios según porcentajes.
 * 
 * @param servicios Array de objetos {nombre, porcentaje}
 */
export async function distribuirPorServicios(
  servicios: Array<{ nombre: string; porcentaje: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    // Validar que los porcentajes sumen 100
    const totalPorcentaje = servicios.reduce((sum, s) => sum + s.porcentaje, 0);
    if (Math.abs(totalPorcentaje - 100) > 0.01) {
      throw new Error(`Los porcentajes deben sumar 100%. Suma actual: ${totalPorcentaje}%`);
    }
    
    // Vaciar la tabla de balances por servicio
    await truncateBalancesServicio();
    
    // Obtener todas las cuentas de trabajo
    const cuentas = await getAllCuentas();
    
    // Distribuir cada cuenta entre los servicios
    const balancesDistribuidos: InsertBalanceServicio[] = [];
    
    for (const servicio of servicios) {
      for (const cuenta of cuentas) {
        // Calcular el valor distribuido
        const valorDistribuido = Math.round(cuenta.valor * (servicio.porcentaje / 100));
        
        balancesDistribuidos.push({
          servicio: servicio.nombre,
          porcentaje: servicio.porcentaje,
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          valor: valorDistribuido,
          longitud: cuenta.longitud,
          esHoja: cuenta.esHoja,
        });
      }
    }
    
    // Insertar todos los balances distribuidos
    if (balancesDistribuidos.length > 0) {
      // Insertar en lotes de 1000 para evitar problemas de memoria
      const batchSize = 1000;
      for (let i = 0; i < balancesDistribuidos.length; i += batchSize) {
        const batch = balancesDistribuidos.slice(i, i + batchSize);
        await db.insert(balancesServicio).values(batch);
      }
    }
    
    console.log(`[Database] Distribuidos ${balancesDistribuidos.length} registros entre ${servicios.length} servicios`);
  } catch (error) {
    console.error("[Database] Failed to distribute by services:", error);
    throw error;
  }
}

/**
 * Obtiene los balances de un servicio específico.
 */
export async function getBalancesPorServicio(nombreServicio: string): Promise<BalanceServicio[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    const result = await db.select().from(balancesServicio).where(eq(balancesServicio.servicio, nombreServicio));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get balances by service:", error);
    throw error;
  }
}

/**
 * Calcula totales por clase para un servicio específico.
 */
export async function calcularTotalesPorServicio(nombreServicio: string): Promise<{
  servicio: string;
  porcentaje: number;
  activos: number;
  pasivos: number;
  patrimonio: number;
  ingresos: number;
  gastos: number;
  costos: number;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    // Sumar solo las cuentas hoja agrupadas por el primer dígito
    const result = await db.execute(sql`
      SELECT 
        servicio,
        porcentaje,
        LEFT(codigo, 1) as clase,
        SUM(valor) as total
      FROM balances_servicio
      WHERE servicio = ${nombreServicio} AND es_hoja = 1
      GROUP BY servicio, porcentaje, LEFT(codigo, 1)
    `);
    
    const totales = {
      servicio: nombreServicio,
      porcentaje: 0,
      activos: 0,
      pasivos: 0,
      patrimonio: 0,
      ingresos: 0,
      gastos: 0,
      costos: 0,
    };
    
    // El resultado de db.execute() en mysql2 tiene la estructura [rows, fields]
    const rows = Array.isArray(result) && result.length > 0 ? result[0] : [];
    
    for (const row of rows as any[]) {
      const clase = row.clase;
      const total = Number(row.total) || 0;
      
      // Obtener el porcentaje (es el mismo para todas las filas)
      if (totales.porcentaje === 0) {
        totales.porcentaje = Number(row.porcentaje) || 0;
      }
      
      switch (clase) {
        case '1':
          totales.activos = total;
          break;
        case '2':
          totales.pasivos = total;
          break;
        case '3':
          totales.patrimonio = total;
          break;
        case '4':
          totales.ingresos = total;
          break;
        case '5':
          totales.gastos = total;
          break;
        case '6':
          totales.costos = total;
          break;
      }
    }
    
    return totales;
  } catch (error) {
    console.error("[Database] Failed to calculate totals by service:", error);
    throw error;
  }
}

/**
 * Obtiene los totales de todos los servicios.
 */
export async function getTotalesTodosServicios(): Promise<Array<{
  servicio: string;
  porcentaje: number;
  activos: number;
  pasivos: number;
  patrimonio: number;
  ingresos: number;
  gastos: number;
  costos: number;
}>> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  try {
    // Obtener la lista de servicios únicos
    const serviciosResult = await db.execute(sql`
      SELECT DISTINCT servicio FROM balances_servicio
    `);
    
    const rows = Array.isArray(serviciosResult) && serviciosResult.length > 0 ? serviciosResult[0] : [];
    const servicios = (rows as any[]).map(r => r.servicio);
    
    // Calcular totales para cada servicio
    const totales = [];
    for (const servicio of servicios) {
      const totalServicio = await calcularTotalesPorServicio(servicio);
      totales.push(totalServicio);
    }
    
    return totales;
  } catch (error) {
    console.error("[Database] Failed to get totals for all services:", error);
    throw error;
  }
}
