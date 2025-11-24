import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabla temporal para almacenar cuentas del balance cargado.
 * Se sobrescribe (TRUNCATE) cada vez que se carga un nuevo archivo Excel.
 * No se almacena historial - solo el balance actual en procesamiento.
 */
export const cuentasTrabajo = mysqlTable("cuentas_trabajo", {
  id: int("id").autoincrement().primaryKey(),
  /** Código de la cuenta PUC (ej: "1", "11", "1105", "110505") */
  codigo: varchar("codigo", { length: 20 }).notNull(),
  /** Nombre/denominación de la cuenta */
  nombre: text("nombre").notNull(),
  /** Valor numérico de la cuenta */
  valor: int("valor").notNull().default(0),
  /** Longitud del código (1=Clase, 2=Grupo, 4=Cuenta, 6=Subcuenta) */
  longitud: int("longitud").notNull(),
  /** Indica si es una cuenta hoja (sin subcuentas) */
  esHoja: int("es_hoja").notNull().default(0), // 0=false, 1=true (MySQL no tiene boolean nativo)
  /** Timestamp de creación */
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CuentaTrabajo = typeof cuentasTrabajo.$inferSelect;
export type InsertCuentaTrabajo = typeof cuentasTrabajo.$inferInsert;

/**
 * Tabla para almacenar balances distribuidos por servicio.
 * Se genera a partir de cuentas_trabajo aplicando porcentajes de distribución.
 */
export const balancesServicio = mysqlTable("balances_servicio", {
  id: int("id").autoincrement().primaryKey(),
  /** Nombre del servicio (ej: "Acueducto", "Alcantarillado", "Aseo") */
  servicio: varchar("servicio", { length: 50 }).notNull(),
  /** Porcentaje de distribución (0-100) */
  porcentaje: int("porcentaje").notNull(),
  /** Código de la cuenta PUC */
  codigo: varchar("codigo", { length: 20 }).notNull(),
  /** Nombre/denominación de la cuenta */
  nombre: text("nombre").notNull(),
  /** Valor distribuido = valor_original * (porcentaje / 100) */
  valor: int("valor").notNull().default(0),
  /** Longitud del código */
  longitud: int("longitud").notNull(),
  /** Indica si es una cuenta hoja */
  esHoja: int("es_hoja").notNull().default(0),
  /** Timestamp de creación */
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BalanceServicio = typeof balancesServicio.$inferSelect;
export type InsertBalanceServicio = typeof balancesServicio.$inferInsert;