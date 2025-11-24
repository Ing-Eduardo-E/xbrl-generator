CREATE TABLE `cuentas_trabajo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(20) NOT NULL,
	`nombre` text NOT NULL,
	`valor` int NOT NULL DEFAULT 0,
	`longitud` int NOT NULL,
	`es_hoja` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cuentas_trabajo_id` PRIMARY KEY(`id`)
);
