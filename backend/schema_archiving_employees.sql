-- ======================================================================
-- BUREAU OF LOCAL GOVERNMENT FINANCE - REGIONAL OFFICE II (BLGF R2)
-- Database Schema Extension for:
--   Regional Issuances Tracking
--   Document Archiving & Retention
--   Employee Profiles Directory
-- Target Engine: MySQL 8.0+
-- ======================================================================

-- This file extends the existing `blgf_region2_doctrack` schema.
-- Run after schema.sql or incorporate both into one migration.

USE `blgf_region2_doctrack`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `employee_folder_files`;
DROP TABLE IF EXISTS `employee_folders`;
DROP TABLE IF EXISTS `employee_profiles`;
DROP TABLE IF EXISTS `issuance_attachments`;
DROP TABLE IF EXISTS `issuances`;
DROP TABLE IF EXISTS `archive_records`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------
-- 1. EMPLOYEE PROFILES TABLE
-- ----------------------------------------------------------------------
-- Stores a directory of BLGF Region II personnel, Provincial Treasurers,
-- Municipal Treasurers, and LGU staff who interact with the office.
CREATE TABLE `employee_profiles` (
  `id` VARCHAR(64) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(255) NOT NULL,
  `office` VARCHAR(255) NOT NULL COMMENT 'Department or LGU office name',
  `office_type` ENUM('BLGF','MUNICIPAL_TREASURER','PROVINCIAL_TREASURER','LGU') NOT NULL DEFAULT 'BLGF',
  `division_code` VARCHAR(20) DEFAULT NULL COMMENT 'Link to divisions.code for BLGF personnel',
  `email` VARCHAR(150) NOT NULL,
  `contact_no` VARCHAR(50) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_emp_office_type` (`office_type`),
  KEY `idx_emp_division` (`division_code`),
  KEY `idx_emp_active` (`active`),
  KEY `idx_emp_name` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------
-- 2. EMPLOYEE FOLDERS TABLE
-- ----------------------------------------------------------------------
-- Per-employee document organization folders (e.g., "Tax Assessment Docs",
-- "Personnel Records", "Memos", etc.)
CREATE TABLE `employee_folders` (
  `id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fld_employee` (`employee_id`),
  CONSTRAINT `fk_fld_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 3. EMPLOYEE FOLDER FILES TABLE
-- ----------------------------------------------------------------------
-- Tracks files stored within each employee's folders.
CREATE TABLE `employee_folder_files` (
  `id` VARCHAR(64) NOT NULL,
  `folder_id` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` VARCHAR(50) DEFAULT NULL COMMENT 'Human-readable file size e.g. 2.4 MB',
  `file_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME type',
  `file_url` TEXT DEFAULT NULL COMMENT 'URL or path to file',
  `uploaded_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_eff_folder` (`folder_id`),
  CONSTRAINT `fk_eff_folder` FOREIGN KEY (`folder_id`) REFERENCES `employee_folders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------
-- 4. ISSUANCES TABLE
-- ----------------------------------------------------------------------
-- Regional Issuances: Regional Memorandum Orders, Circulars, Special Orders,
-- Advisories, and Directives published by BLGF Region II.
CREATE TABLE `issuances` (
  `id` VARCHAR(64) NOT NULL,
  `issuance_no` VARCHAR(100) NOT NULL COMMENT 'e.g. RMO-2026-001',
  `series_year` VARCHAR(10) NOT NULL DEFAULT '2026',
  `category` ENUM('REGIONAL_MEMO_ORDER','REGIONAL_CIRCULAR','SPECIAL_ORDER','REGIONAL_ADVISORY','DIRECTIVE') NOT NULL,
  `subject` TEXT NOT NULL,
  `date_issued` DATE NOT NULL,
  `signatory_name` VARCHAR(255) NOT NULL,
  `signatory_position` VARCHAR(255) NOT NULL,
  `target_audience` TEXT DEFAULT NULL,
  `status` ENUM('ACTIVE','SUPERSEDED','RESCINDED') NOT NULL DEFAULT 'ACTIVE',
  `remarks` TEXT DEFAULT NULL,
  `created_by` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_issuance_no` (`issuance_no`),
  KEY `idx_iss_category` (`category`),
  KEY `idx_iss_series` (`series_year`),
  KEY `idx_iss_status` (`status`),
  KEY `idx_iss_date` (`date_issued`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------
-- 5. ISSUANCE ATTACHMENTS TABLE
-- ----------------------------------------------------------------------
-- File attachments (PDFs, etc.) linked to each regional issuance.
CREATE TABLE `issuance_attachments` (
  `id` VARCHAR(64) NOT NULL,
  `issuance_id` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` VARCHAR(50) DEFAULT NULL,
  `file_type` VARCHAR(100) DEFAULT NULL,
  `upload_date` DATE DEFAULT NULL,
  `file_url` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ia_issuance` (`issuance_id`),
  CONSTRAINT `fk_ia_issuance` FOREIGN KEY (`issuance_id`) REFERENCES `issuances`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------
-- 6. ARCHIVE RECORDS TABLE
-- ----------------------------------------------------------------------
-- Document archival records. Documents moved from active tracking to
-- permanent storage vaults. Supports retention schedules and restoration.
CREATE TABLE `archive_records` (
  `id` VARCHAR(64) NOT NULL,
  `document_id` VARCHAR(64) NOT NULL COMMENT 'FK to documents.id',
  `tracking_number` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subject` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `originating_office` VARCHAR(255) DEFAULT NULL,
  `destination_office` VARCHAR(255) DEFAULT NULL,
  `archive_destination` ENUM('VAULT_ROOM_101','NATIONAL_ARCHIVES_DEPOT','DIGITAL_MICROFILM_CLOUD','REGION_2_CENTRAL_FILE','DISPOSAL_QUEUE') NOT NULL DEFAULT 'VAULT_ROOM_101',
  `archive_date` DATETIME NOT NULL,
  `retention_years` INT NOT NULL DEFAULT 10,
  `archive_reason` TEXT DEFAULT NULL,
  `reason` TEXT DEFAULT NULL COMMENT 'Alias for archive_reason for compatibility',
  `archived_by` VARCHAR(255) NOT NULL,
  `restored_at` DATETIME DEFAULT NULL COMMENT 'When the document was restored from archive',
  `status` ENUM('ARCHIVED','RESTORED','PERMANENTLY_DELETED') NOT NULL DEFAULT 'ARCHIVED',
  PRIMARY KEY (`id`),
  KEY `idx_arch_doc` (`document_id`),
  KEY `idx_arch_tracking` (`tracking_number`),
  KEY `idx_arch_dest` (`archive_destination`),
  KEY `idx_arch_status` (`status`),
  KEY `idx_arch_date` (`archive_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================================
-- End of Schema Extension
-- Version: 1.0.0 (2026-07-27)
-- ======================================================================
