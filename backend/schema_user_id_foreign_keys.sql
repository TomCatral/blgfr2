-- One-time SQL migration for stable user-ID document ownership and routing.
-- The application also performs an idempotent equivalent at startup.
-- MySQL 8.0+

ALTER TABLE `documents`
  ADD COLUMN IF NOT EXISTS `assigned_user_id` VARCHAR(64) NULL AFTER `assigned_user`,
  ADD COLUMN IF NOT EXISTS `created_by_user_id` VARCHAR(64) NULL AFTER `created_by`;

ALTER TABLE `document_routes`
  ADD COLUMN IF NOT EXISTS `from_user_id` VARCHAR(64) NULL AFTER `from_division`;

ALTER TABLE `employee_profiles`
  ADD COLUMN IF NOT EXISTS `user_id` VARCHAR(64) NULL AFTER `id`;

-- Backfill legacy name-only data once. Runtime authorization does not use names.
UPDATE `documents` d
LEFT JOIN `users` assigned_user
  ON LOWER(TRIM(assigned_user.full_name)) = LOWER(TRIM(d.assigned_user))
LEFT JOIN `users` creator
  ON LOWER(TRIM(creator.full_name)) = LOWER(TRIM(d.created_by))
SET d.assigned_user_id = COALESCE(d.assigned_user_id, assigned_user.id),
    d.created_by_user_id = COALESCE(d.created_by_user_id, creator.id)
WHERE d.assigned_user_id IS NULL OR d.created_by_user_id IS NULL;

UPDATE `document_routes` r
LEFT JOIN `users` sender
  ON LOWER(TRIM(sender.full_name)) = LOWER(TRIM(r.from_user))
LEFT JOIN `users` recipient
  ON LOWER(TRIM(recipient.full_name)) = LOWER(TRIM(r.to_user))
SET r.from_user_id = COALESCE(r.from_user_id, sender.id),
    r.to_user_id = COALESCE(r.to_user_id, recipient.id)
WHERE r.from_user_id IS NULL OR r.to_user_id IS NULL;

UPDATE `employee_profiles` ep
JOIN `users` u ON LOWER(TRIM(u.full_name)) = LOWER(TRIM(ep.full_name))
SET ep.user_id = COALESCE(ep.user_id, u.id)
WHERE ep.user_id IS NULL;

CREATE INDEX `idx_documents_assigned_user_id` ON `documents` (`assigned_user_id`);
CREATE INDEX `idx_documents_created_by_user_id` ON `documents` (`created_by_user_id`);
CREATE INDEX `idx_document_routes_from_user_id` ON `document_routes` (`from_user_id`);
CREATE UNIQUE INDEX `uq_employee_profiles_user_id` ON `employee_profiles` (`user_id`);

ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_assigned_user`
    FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_documents_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `document_routes`
  ADD CONSTRAINT `fk_document_routes_from_user`
    FOREIGN KEY (`from_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_document_routes_to_user`
    FOREIGN KEY (`to_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employee_profiles`
  ADD CONSTRAINT `fk_employee_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
