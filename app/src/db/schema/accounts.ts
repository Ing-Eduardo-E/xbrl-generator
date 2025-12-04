import { pgTable, text, integer, boolean, timestamp, serial } from 'drizzle-orm/pg-core';

/**
 * Tabla de cuentas de trabajo (temporal)
 * Se trunca en cada carga de balance
 */
export const workingAccounts = pgTable('working_accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(), // Código PUC
  name: text('name').notNull(), // Nombre de la cuenta
  value: integer('value').notNull(), // Valor en pesos
  isLeaf: boolean('is_leaf').notNull().default(false), // Es cuenta hoja?
  level: integer('level').notNull(), // Nivel en jerarquía
  class: text('class').notNull(), // Clase (1=Activos, 2=Pasivos, etc.)
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Tabla de balances distribuidos por servicio
 */
export const serviceBalances = pgTable('service_balances', {
  id: serial('id').primaryKey(),
  service: text('service').notNull(), // 'acueducto', 'alcantarillado', 'aseo'
  code: text('code').notNull(), // Código PUC
  name: text('name').notNull(), // Nombre de la cuenta
  value: integer('value').notNull(), // Valor distribuido
  isLeaf: boolean('is_leaf').notNull().default(false), // Es cuenta hoja?
  level: integer('level').notNull().default(1), // Nivel en jerarquía
  class: text('class').notNull().default(''), // Clase contable
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Tabla de sesiones de balance (opcional para tracking)
 */
export const balanceSessions = pgTable('balance_sessions', {
  id: serial('id').primaryKey(),
  fileName: text('file_name').notNull(),
  niifGroup: text('niif_group').notNull(), // grupo1, grupo2, grupo3, r414
  accountsCount: integer('accounts_count').notNull(),
  distribution: text('distribution'), // JSON con porcentajes
  usuariosEstrato: text('usuarios_estrato'), // JSON con usuarios por estrato y servicio
  subsidios: text('subsidios'), // JSON con subsidios por servicio
  status: text('status').notNull().default('pending'), // pending, distributed, completed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
