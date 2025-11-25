CREATE TABLE `balances_servicio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`servicio` varchar(50) NOT NULL,
	`porcentaje` int NOT NULL,
	`codigo` varchar(20) NOT NULL,
	`nombre` text NOT NULL,
	`valor` int NOT NULL DEFAULT 0,
	`longitud` int NOT NULL,
	`es_hoja` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `balances_servicio_id` PRIMARY KEY(`id`)
);
