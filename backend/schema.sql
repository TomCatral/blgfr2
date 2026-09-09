-- ======================================================================
-- BUREAU OF LOCAL GOVERNMENT FINANCE - REGIONAL OFFICE II (BLGF R2)
-- Database Schema Definition & Initial Seed Data Script
-- Target Engine: MySQL 8.0+
-- ======================================================================

CREATE DATABASE IF NOT EXISTS `blgf_region2_doctrack` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `blgf_region2_doctrack`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `employee_folder_files`;
DROP TABLE IF EXISTS `employee_folders`;
DROP TABLE IF EXISTS `employee_profiles`;
DROP TABLE IF EXISTS `issuance_attachments`;
DROP TABLE IF EXISTS `issuances`;
DROP TABLE IF EXISTS `archive_records`;
DROP TABLE IF EXISTS `document_attachments`;
DROP TABLE IF EXISTS `document_routes`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `envelope_logs`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `divisions`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------
-- 1. DIVISIONS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE `divisions` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `chief_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Divisions are intentionally not seeded here. Manage them through the
-- application/database so only explicitly saved division records are used.

-- ----------------------------------------------------------------------
-- 2. USERS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE `users` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `source_username` VARCHAR(50) NOT NULL,
  `password` TEXT DEFAULT NULL,
  `temporary_password_expires_at` DATETIME(3) DEFAULT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `role` ENUM('SYSTEM_ADMIN', 'ADMIN', 'ORD', 'RECORDS_OFFICER', 'DIVISION_CHIEF', 'ACTION_OFFICER', 'STAFF') NOT NULL,
  `division_code` VARCHAR(20) NOT NULL,
  `designation` VARCHAR(150) DEFAULT NULL,
  `contact_no` VARCHAR(50) DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `permissions` JSON DEFAULT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_division_code` (`division_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User accounts are intentionally not seeded here. Create and manage accounts
-- through the application so authentication uses only database-stored users.

-- ----------------------------------------------------------------------
-- 3. DOCUMENTS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE `documents` (
  `id` VARCHAR(64) NOT NULL,
  `tracking_number` VARCHAR(100) NOT NULL UNIQUE,
  `direction` ENUM('INCOMING', 'OUTGOING') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subject` TEXT DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL,
  `originating_office` VARCHAR(255) NOT NULL,
  `destination_office` VARCHAR(255) NOT NULL,
  `sender_name` VARCHAR(150) DEFAULT NULL,
  `recipient_name` VARCHAR(150) DEFAULT NULL,
  `priority` ENUM('ROUTINE', 'URGENT', 'VERY_URGENT', 'CONFIDENTIAL') NOT NULL DEFAULT 'ROUTINE',
  `current_status` ENUM('PENDING', 'IN_PROGRESS', 'FOR_SIGNATURE', 'COMPLETED', 'RETURNED', 'ON_HOLD', 'ARCHIVED') NOT NULL DEFAULT 'PENDING',
  `current_division` VARCHAR(20) NOT NULL,
  `assigned_user` VARCHAR(150) DEFAULT NULL,
  `assigned_user_id` VARCHAR(64) DEFAULT NULL,
  `date_received` DATETIME NOT NULL,
  `target_completion_date` DATETIME DEFAULT NULL,
  `completed_date` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(150) NOT NULL,
  `created_by_user_id` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tracking_no` (`tracking_number`),
  KEY `idx_status` (`current_status`),
  KEY `idx_division` (`current_division`),
  KEY `idx_documents_assigned_user_id` (`assigned_user_id`),
  KEY `idx_documents_created_by_user_id` (`created_by_user_id`),
  CONSTRAINT `fk_documents_assigned_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_documents_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- 4. DOCUMENT ROUTES TABLE
-- ----------------------------------------------------------------------
CREATE TABLE `document_routes` (
  `id` VARCHAR(64) NOT NULL,
  `document_id` VARCHAR(64) NOT NULL,
  `step_number` INT NOT NULL,
  `from_division` VARCHAR(20) NOT NULL,
  `from_user_id` VARCHAR(64) DEFAULT NULL,
  `from_user` VARCHAR(150) NOT NULL,
  `to_division` VARCHAR(20) NOT NULL,
  `to_user` VARCHAR(150) DEFAULT NULL,
  `to_user_id` VARCHAR(64) DEFAULT NULL,
  `action_requested` VARCHAR(255) NOT NULL,
  `remarks` TEXT DEFAULT NULL,
  `status_before` VARCHAR(50) NOT NULL,
  `status_after` VARCHAR(50) NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_document_routes_from_user_id` (`from_user_id`),
  KEY `idx_document_routes_to_user_id` (`to_user_id`),
  CONSTRAINT `fk_document_routes_document` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_document_routes_from_user` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_document_routes_to_user` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `document_attachments` (
  `id` VARCHAR(64) NOT NULL,
  `document_id` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` VARCHAR(50) DEFAULT NULL,
  `file_type` VARCHAR(100) DEFAULT NULL,
  `upload_date` DATETIME NOT NULL,
  `file_data` MEDIUMTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_document_attachment_document` (`document_id`),
  CONSTRAINT `fk_document_attachment_document`
    FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------
-- 5. AUDIT LOGS TABLE
-- ----------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `user_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `document_tracking_number` VARCHAR(100) DEFAULT NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Envelope dispatch history is intentionally stored separately from the
-- system transaction/audit trail.
CREATE TABLE `envelope_logs` (
  `id` VARCHAR(64) NOT NULL,
  `timestamp` DATETIME(3) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `user_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL DEFAULT 'ENVELOPE_LOG',
  `document_tracking_number` VARCHAR(100) DEFAULT NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_envelope_timestamp` (`timestamp`),
  KEY `idx_envelope_tracking_number` (`document_tracking_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================================================================
-- 7. EMPLOYEE PROFILES TABLE (Regional Issuance Archiving & Employee Profile)
-- ======================================================================
CREATE TABLE `employee_profiles` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
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
  ,UNIQUE KEY `uq_employee_profiles_user_id` (`user_id`)
  ,CONSTRAINT `fk_employee_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ======================================================================
-- 8. EMPLOYEE FOLDERS TABLE
-- ======================================================================
CREATE TABLE `employee_folders` (
  `id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fld_employee` (`employee_id`),
  CONSTRAINT `fk_fld_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_profiles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================================================================
-- 9. EMPLOYEE FOLDER FILES TABLE
-- ======================================================================
CREATE TABLE `employee_folder_files` (
  `id` VARCHAR(64) NOT NULL,
  `folder_id` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` VARCHAR(50) DEFAULT NULL,
  `file_type` VARCHAR(100) DEFAULT NULL,
  `file_url` TEXT DEFAULT NULL,
  `uploaded_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_eff_folder` (`folder_id`),
  CONSTRAINT `fk_eff_folder` FOREIGN KEY (`folder_id`) REFERENCES `employee_folders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================================================================
-- 10. ISSUANCES TABLE (Regional Issuances)
-- ======================================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ======================================================================
-- 11. ISSUANCE ATTACHMENTS TABLE
-- ======================================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ======================================================================
-- 12. ARCHIVE RECORDS TABLE
-- ======================================================================
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
-- End of Schema Definition for BLGF Region II Document Tracking System
-- Includes: Divisions, Users, Documents, Routes, Audit Logs,
--           Employee Profiles, Employee Folders, Issuances, Archive Records
-- Version: 2.0.0 (2026-07-27)
-- ======================================================================
