import type { Pool, RowDataPacket } from "mysql2/promise";

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

export async function ensureDatabaseSchema(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS formulas (
      id CHAR(36) PRIMARY KEY,
      formula VARCHAR(255),
      partes DECIMAL(18,4),
      hoja VARCHAR(50),
      total_items INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_formulas_formula_hoja (formula, hoja),
      INDEX idx_formulas_formula (formula),
      INDEX idx_formulas_hoja (hoja)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [columns] = await pool.query<ColumnRow[]>(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'formulas'
      AND COLUMN_NAME IN ('warnings_json', 'diagnostics_json')
  `);

  const hasWarningsColumn = columns.some(
    (column) => column.COLUMN_NAME === "warnings_json",
  );
  const hasDiagnosticsColumn = columns.some(
    (column) => column.COLUMN_NAME === "diagnostics_json",
  );

  if (hasWarningsColumn) {
    await pool.execute(`ALTER TABLE formulas DROP COLUMN warnings_json`);
  }

  if (hasDiagnosticsColumn) {
    await pool.execute(`ALTER TABLE formulas DROP COLUMN diagnostics_json`);
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS formula_items (
      id CHAR(36) PRIMARY KEY,
      nome VARCHAR(255),
      formula_id CHAR(36) NOT NULL,
      item_number INT,
      codigo VARCHAR(100),
      partes INT,
      costo DECIMAL(18,4),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_formula_items_formula_id
        FOREIGN KEY (formula_id) REFERENCES formulas(id)
        ON DELETE CASCADE,
      INDEX idx_formula_items_formula_id (formula_id),
      INDEX idx_formula_items_codigo (codigo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS processed_drive_files (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      drive_file_id VARCHAR(255) NOT NULL,
      file_name VARCHAR(512) NOT NULL,
      modified_time VARCHAR(64) NOT NULL,
      status ENUM('success', 'failed') NOT NULL,
      last_processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_processed_drive_files_drive_file_id (drive_file_id),
      INDEX idx_processed_drive_files_status (status),
      INDEX idx_processed_drive_files_last_processed_at (last_processed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}
