-- HỆ THỐNG TUYỂN DỤNG THÔNG MINH TÍCH HỢP AI
-- Bản đầy đủ trong một file: 25 bảng, 43 khóa ngoại, index và dữ liệu demo.
-- Bản dành cho XAMPP / MariaDB 10.4.32; InnoDB; UTF-8; thời gian lưu UTC.
-- Cách dùng: phpMyAdmin > Nhập (Import) > chọn file này > Thực hiện (Go).
-- File tự tạo database smart_recruitment. Không chạy lại nếu đã có các bảng này.
-- Không cần chạy thêm file schema, index hoặc dữ liệu mẫu riêng.
--
-- Tài khoản demo local, mật khẩu chung: DemoLocal!2026
-- Admin: admin@demo.local
-- Ứng viên: ungvien1@demo.local, ungvien2@demo.local
-- Công ty: congty1@demo.local, congty2@demo.local
-- password_hash dùng scrypt N=16384, r=8, p=1, dkLen=64.
-- Định dạng: scrypt$N$r$p$saltHex$hashHex; backend dùng scrypt để xác minh.
-- Dữ liệu mẫu không có tệp Cloudinary hoặc kết quả AI giả.
--
-- PHẦN 1: DATABASE, BẢNG, RÀNG BUỘC VÀ INDEX

CREATE DATABASE IF NOT EXISTS smart_recruitment
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_recruitment;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'scrypt$N$r$p$saltHex$hashHex',
  role ENUM('CANDIDATE','COMPANY','ADMIN') NOT NULL,
  status ENUM('ACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role_status_created (role, status, created_at, id),
  CONSTRAINT ck_users_email CHECK (CHAR_LENGTH(TRIM(email)) > 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tai khoan dang nhap; cong ty khong co nguoi phu trach';

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_reset_token (token_hash),
  KEY ix_reset_user (user_id, expires_at),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_locations_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE industries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_industries_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE skills (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_skills_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE skill_aliases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  skill_id INT UNSIGNED NOT NULL,
  alias VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_skill_alias (alias),
  CONSTRAINT fk_alias_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Vi du NodeJS va Node.js quy ve cung mot ky nang';
CREATE TABLE job_levels (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_levels_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE employment_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_employment_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media_assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  purpose ENUM('AVATAR','LOGO','CV') NOT NULL,
  cloudinary_asset_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  public_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  resource_type ENUM('image','raw') NOT NULL,
  delivery_type ENUM('upload','authenticated') NOT NULL,
  version BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  file_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_media_asset (cloudinary_asset_id),
  UNIQUE KEY uq_media_locator (public_id, resource_type, delivery_type),
  KEY ix_media_owner (owner_user_id, purpose),
  CONSTRAINT fk_media_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
  CONSTRAINT ck_media_size CHECK (byte_size > 0),
  CONSTRAINT ck_media_cv CHECK (purpose <> 'CV' OR (resource_type = 'raw' AND delivery_type = 'authenticated'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tep goc bat bien; khong luu URL tai tam; CV khong de public';

CREATE TABLE candidate_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  headline VARCHAR(200) NULL,
  summary TEXT NULL,
  avatar_asset_id BIGINT UNSIGNED NULL,
  location_id INT UNSIGNED NULL,
  desired_location_id INT UNSIGNED NULL,
  desired_industry_id INT UNSIGNED NULL,
  desired_employment_type_id INT UNSIGNED NULL,
  desired_work_mode ENUM('ONSITE','HYBRID','REMOTE') NULL,
  desired_salary_min DECIMAL(15,2) NULL COMMENT 'VND moi thang',
  profile_version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_profile_avatar FOREIGN KEY (avatar_asset_id) REFERENCES media_assets(id),
  CONSTRAINT fk_profile_location FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT fk_profile_desired_location FOREIGN KEY (desired_location_id) REFERENCES locations(id),
  CONSTRAINT fk_profile_industry FOREIGN KEY (desired_industry_id) REFERENCES industries(id),
  CONSTRAINT fk_profile_employment FOREIGN KEY (desired_employment_type_id) REFERENCES employment_types(id),
  CONSTRAINT ck_profile_salary CHECK (desired_salary_min IS NULL OR desired_salary_min >= 0),
  CONSTRAINT ck_profile_name CHECK (CHAR_LENGTH(TRIM(full_name)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_educations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id BIGINT UNSIGNED NOT NULL,
  school_name VARCHAR(200) NOT NULL,
  major VARCHAR(150) NULL,
  degree VARCHAR(100) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  description TEXT NULL,
  CONSTRAINT fk_education_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT ck_education_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE candidate_experiences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id BIGINT UNSIGNED NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL COMMENT 'NULL nghia la dang lam',
  description TEXT NULL,
  CONSTRAINT fk_experience_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT ck_experience_dates CHECK (end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE candidate_projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  project_url VARCHAR(500) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  CONSTRAINT fk_project_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT ck_project_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE candidate_certifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  issuer VARCHAR(200) NULL,
  issued_date DATE NULL,
  expires_date DATE NULL,
  credential_url VARCHAR(500) NULL,
  CONSTRAINT fk_cert_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT ck_cert_dates CHECK (expires_date IS NULL OR issued_date IS NULL OR expires_date >= issued_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE candidate_skills (
  candidate_id BIGINT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  proficiency ENUM('BASIC','INTERMEDIATE','ADVANCED') NULL,
  evidence TEXT NULL,
  PRIMARY KEY (candidate_id, skill_id),
  CONSTRAINT fk_cskill_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_cskill_skill FOREIGN KEY (skill_id) REFERENCES skills(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE companies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  industry_id INT UNSIGNED NULL,
  location_id INT UNSIGNED NULL,
  address VARCHAR(300) NULL,
  website VARCHAR(500) NULL,
  contact_email VARCHAR(254) NULL,
  company_size VARCHAR(50) NULL,
  logo_asset_id BIGINT UNSIGNED NULL,
  verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  verification_note VARCHAR(1000) NULL,
  verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_company_user (user_id),
  KEY ix_company_verification_created (verification_status, created_at, id),
  CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_company_industry FOREIGN KEY (industry_id) REFERENCES industries(id),
  CONSTRAINT fk_company_location FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT fk_company_logo FOREIGN KEY (logo_asset_id) REFERENCES media_assets(id),
  CONSTRAINT ck_company_name CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mot tai khoan mot cong ty; khong co bang nguoi phu trach';

CREATE TABLE cv_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  candidate_id BIGINT UNSIGNED NOT NULL,
  file_asset_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  processing_status ENUM('UPLOADED','QUEUED','PROCESSING','READY','FAILED') NOT NULL DEFAULT 'UPLOADED',
  raw_text MEDIUMTEXT NULL,
  parsed_data JSON NULL,
  extraction_version INT UNSIGNED NOT NULL DEFAULT 0,
  error_message VARCHAR(1000) NULL,
  parsed_at DATETIME(3) NULL,
  archived_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_cv_asset (file_asset_id),
  UNIQUE KEY uq_cv_owner (id, candidate_id),
  KEY ix_cv_candidate_created (candidate_id, archived_at, created_at, id),
  CONSTRAINT fk_cv_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id),
  CONSTRAINT fk_cv_asset FOREIGN KEY (file_asset_id) REFERENCES media_assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Moi lan tai len la mot CV moi; AI chi de xuat du lieu';

CREATE TABLE job_posts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  requirements TEXT NULL,
  benefits TEXT NULL,
  industry_id INT UNSIGNED NULL,
  location_id INT UNSIGNED NULL,
  level_id INT UNSIGNED NULL,
  employment_type_id INT UNSIGNED NULL,
  work_mode ENUM('ONSITE','HYBRID','REMOTE') NOT NULL DEFAULT 'ONSITE',
  address VARCHAR(300) NULL,
  salary_negotiable BOOLEAN NOT NULL DEFAULT TRUE,
  salary_min DECIMAL(15,2) NULL,
  salary_max DECIMAL(15,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  salary_period ENUM('MONTH') NOT NULL DEFAULT 'MONTH',
  min_experience_months INT UNSIGNED NOT NULL DEFAULT 0,
  education_requirement VARCHAR(200) NULL,
  vacancies INT UNSIGNED NOT NULL DEFAULT 1,
  application_deadline DATETIME(3) NULL,
  status ENUM('DRAFT','NEEDS_CHANGES','PUBLISHED','CLOSED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_reason VARCHAR(1000) NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  validation_errors JSON NULL,
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_jobs_expiry (status, application_deadline),
  KEY ix_jobs_company (company_id, status, created_at),
  KEY ix_jobs_filters (industry_id, location_id, level_id),
  KEY ix_jobs_feed (status, is_hidden, published_at, id),
  KEY ix_jobs_location_feed (location_id, status, is_hidden, published_at, id),
  FULLTEXT KEY ft_jobs_search (title, description, requirements),
  CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_job_industry FOREIGN KEY (industry_id) REFERENCES industries(id),
  CONSTRAINT fk_job_location FOREIGN KEY (location_id) REFERENCES locations(id),
  CONSTRAINT fk_job_level FOREIGN KEY (level_id) REFERENCES job_levels(id),
  CONSTRAINT fk_job_employment FOREIGN KEY (employment_type_id) REFERENCES employment_types(id),
  CONSTRAINT ck_job_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT ck_job_vacancies CHECK (vacancies > 0),
  CONSTRAINT ck_job_salary CHECK (
    (salary_negotiable = TRUE AND salary_min IS NULL AND salary_max IS NULL)
    OR (salary_negotiable = FALSE AND salary_min IS NOT NULL AND salary_max IS NOT NULL
        AND salary_min >= 0 AND salary_max >= salary_min)),
  CONSTRAINT ck_job_currency CHECK (currency = 'VND'),
  CONSTRAINT ck_job_published CHECK (status <> 'PUBLISHED' OR
    (description IS NOT NULL AND CHAR_LENGTH(TRIM(description)) > 0
     AND requirements IS NOT NULL AND CHAR_LENGTH(TRIM(requirements)) > 0
     AND industry_id IS NOT NULL AND level_id IS NOT NULL AND employment_type_id IS NOT NULL
     AND application_deadline IS NOT NULL AND published_at IS NOT NULL
     AND (work_mode = 'REMOTE' OR location_id IS NOT NULL)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Duyet tu dong bang quy tac BE; hidden do admin quan ly doc lap';

CREATE TABLE job_skills (
  job_id BIGINT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  importance TINYINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (job_id, skill_id),
  CONSTRAINT fk_jskill_job FOREIGN KEY (job_id) REFERENCES job_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_jskill_skill FOREIGN KEY (skill_id) REFERENCES skills(id),
  CONSTRAINT ck_jskill_importance CHECK (importance BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE saved_jobs (
  candidate_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (candidate_id, job_id),
  KEY ix_saved_candidate_created (candidate_id, created_at, job_id),
  CONSTRAINT fk_saved_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_job FOREIGN KEY (job_id) REFERENCES job_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE applications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT UNSIGNED NOT NULL,
  candidate_id BIGINT UNSIGNED NOT NULL,
  cv_id BIGINT UNSIGNED NOT NULL,
  cover_letter TEXT NULL,
  status ENUM('SUBMITTED','REVIEWING','INTERVIEW','OFFERED','HIRED','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
  recruiter_note TEXT NULL,
  job_revision INT UNSIGNED NOT NULL,
  job_snapshot JSON NOT NULL,
  cv_snapshot JSON NOT NULL,
  profile_snapshot JSON NOT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_application_once (job_id, candidate_id),
  UNIQUE KEY uq_application_context (id, job_id, cv_id),
  KEY ix_app_candidate (candidate_id, submitted_at),
  KEY ix_app_pipeline_created (job_id, status, submitted_at, id),
  CONSTRAINT fk_application_job FOREIGN KEY (job_id) REFERENCES job_posts(id),
  CONSTRAINT fk_application_candidate FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(user_id),
  CONSTRAINT fk_application_cv_owner FOREIGN KEY (cv_id, candidate_id) REFERENCES cv_documents(id, candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mot ung vien mot tin mot ho so; CV va snapshot khong doi sau nop';

CREATE TABLE interviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  timezone_name VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  mode ENUM('ONLINE','OFFLINE') NOT NULL,
  meeting_url VARCHAR(1000) NULL,
  location_text VARCHAR(500) NULL,
  invitation_note TEXT NULL,
  status ENUM('SCHEDULED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  candidate_response ENUM('PENDING','ACCEPTED','DECLINED') NOT NULL DEFAULT 'PENDING',
  responded_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_interview_application (application_id, starts_at),
  KEY ix_interview_calendar (status, starts_at),
  CONSTRAINT fk_interview_application FOREIGN KEY (application_id) REFERENCES applications(id),
  CONSTRAINT ck_interview_time CHECK (ends_at > starts_at),
  CONSTRAINT ck_interview_mode CHECK (
    (mode = 'ONLINE' AND meeting_url IS NOT NULL AND CHAR_LENGTH(TRIM(meeting_url)) > 0)
    OR (mode = 'OFFLINE' AND location_text IS NOT NULL AND CHAR_LENGTH(TRIM(location_text)) > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  target_path VARCHAR(500) NULL COMMENT 'Duong dan noi bo; van kiem tra quyen khi mo',
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_notifications_inbox (user_id, read_at, created_at),
  KEY ix_notifications_user_created (user_id, created_at, id),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requested_by BIGINT UNSIGNED NOT NULL,
  feature ENUM('PARSE_CV','MATCH_CV','GENERATE_JD','INTERVIEW_QUESTIONS') NOT NULL,
  cv_id BIGINT UNSIGNED NULL,
  job_id BIGINT UNSIGNED NULL,
  application_id BIGINT UNSIGNED NULL,
  status ENUM('QUEUED','RUNNING','SUCCEEDED','FAILED') NOT NULL DEFAULT 'QUEUED',
  input_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  input_snapshot JSON NOT NULL,
  output_json JSON NULL,
  model_name VARCHAR(120) NULL,
  prompt_version VARCHAR(40) NOT NULL,
  algorithm_version VARCHAR(40) NOT NULL,
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  error_code VARCHAR(100) NULL,
  error_message VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  KEY ix_ai_queue (status, created_at),
  KEY ix_ai_requester (requested_by, feature, input_hash),
  CONSTRAINT fk_ai_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_ai_cv FOREIGN KEY (cv_id) REFERENCES cv_documents(id),
  CONSTRAINT fk_ai_job FOREIGN KEY (job_id) REFERENCES job_posts(id),
  CONSTRAINT fk_ai_application FOREIGN KEY (application_id) REFERENCES applications(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trang thai xu ly nghiep vu AI; khong phai trang giam sat AI cho admin';

CREATE TABLE match_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NOT NULL,
  cv_id BIGINT UNSIGNED NOT NULL,
  application_id BIGINT UNSIGNED NULL,
  job_revision INT UNSIGNED NOT NULL,
  cv_extraction_version INT UNSIGNED NOT NULL,
  input_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  algorithm_version VARCHAR(40) NOT NULL,
  evidence_status ENUM('SUFFICIENT','INSUFFICIENT') NOT NULL,
  skill_score DECIMAL(5,2) NULL,
  experience_score DECIMAL(5,2) NULL,
  total_score DECIMAL(5,2) NULL,
  matched_skills JSON NOT NULL,
  missing_skills JSON NOT NULL,
  evidence JSON NOT NULL,
  explanation TEXT NOT NULL,
  suggestions JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_match_task (task_id),
  KEY ix_match_cv_job (cv_id, job_id, job_revision),
  KEY ix_match_application_latest (application_id, created_at, id),
  CONSTRAINT fk_match_task FOREIGN KEY (task_id) REFERENCES ai_tasks(id),
  CONSTRAINT fk_match_job FOREIGN KEY (job_id) REFERENCES job_posts(id),
  CONSTRAINT fk_match_cv FOREIGN KEY (cv_id) REFERENCES cv_documents(id),
  CONSTRAINT fk_match_application_context FOREIGN KEY (application_id, job_id, cv_id)
    REFERENCES applications(id, job_id, cv_id),
  CONSTRAINT ck_match_skill CHECK (skill_score IS NULL OR skill_score BETWEEN 0 AND 100),
  CONSTRAINT ck_match_experience CHECK (experience_score IS NULL OR experience_score BETWEEN 0 AND 100),
  CONSTRAINT ck_match_total CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100),
  CONSTRAINT ck_match_evidence CHECK (evidence_status <> 'INSUFFICIENT' OR total_score IS NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Diem tham khao kem bang chung; ket qua cu van gan voi snapshot cu';

-- PHẦN 2: DANH MỤC VÀ DỮ LIỆU DEMO

START TRANSACTION;
INSERT INTO users (id,email,password_hash,role) VALUES
 (1,'admin@demo.local','scrypt$16384$8$1$49ba6f87fa722601e73a2e2eabd38c0a$e7c0653b3c6f996d15264c71f970afa5ddfc0b0a46c05b57aff72ed17749149a8d501072a1cacdb0ff1605042f551ef713b1ccecf275d54fe45356a21b6717ba','ADMIN'),
 (2,'ungvien1@demo.local','scrypt$16384$8$1$49ba6f87fa722601e73a2e2eabd38c0a$e7c0653b3c6f996d15264c71f970afa5ddfc0b0a46c05b57aff72ed17749149a8d501072a1cacdb0ff1605042f551ef713b1ccecf275d54fe45356a21b6717ba','CANDIDATE'),
 (3,'ungvien2@demo.local','scrypt$16384$8$1$49ba6f87fa722601e73a2e2eabd38c0a$e7c0653b3c6f996d15264c71f970afa5ddfc0b0a46c05b57aff72ed17749149a8d501072a1cacdb0ff1605042f551ef713b1ccecf275d54fe45356a21b6717ba','CANDIDATE'),
 (4,'congty1@demo.local','scrypt$16384$8$1$49ba6f87fa722601e73a2e2eabd38c0a$e7c0653b3c6f996d15264c71f970afa5ddfc0b0a46c05b57aff72ed17749149a8d501072a1cacdb0ff1605042f551ef713b1ccecf275d54fe45356a21b6717ba','COMPANY'),
 (5,'congty2@demo.local','scrypt$16384$8$1$49ba6f87fa722601e73a2e2eabd38c0a$e7c0653b3c6f996d15264c71f970afa5ddfc0b0a46c05b57aff72ed17749149a8d501072a1cacdb0ff1605042f551ef713b1ccecf275d54fe45356a21b6717ba','COMPANY');
INSERT INTO locations (id,name) VALUES (1,'Hà Nội'),(2,'Đà Nẵng'),(3,'Thành phố Hồ Chí Minh');
INSERT INTO industries (id,name) VALUES (1,'Công nghệ thông tin'),(2,'Marketing'),(3,'Kế toán');
INSERT INTO skills (id,name) VALUES
 (1,'JavaScript'),(2,'Node.js'),(3,'Express'),(4,'MySQL'),(5,'React'),(6,'Git'),(7,'HTML'),(8,'CSS'),(9,'TypeScript');
INSERT INTO skill_aliases (skill_id,alias) VALUES
 (1,'JS'),(2,'NodeJS'),(2,'Node JS'),(3,'Express.js'),(5,'ReactJS'),(5,'React.js'),(9,'TS');
INSERT INTO job_levels (id,name) VALUES (1,'Thực tập sinh'),(2,'Fresher'),(3,'Junior'),(4,'Middle'),(5,'Senior');
INSERT INTO employment_types (id,name) VALUES (1,'Toàn thời gian'),(2,'Bán thời gian'),(3,'Thực tập');
INSERT INTO candidate_profiles
 (user_id,full_name,headline,summary,location_id,desired_location_id,desired_industry_id,desired_employment_type_id,desired_work_mode,desired_salary_min)
VALUES
 (2,'Nguyễn Minh An','Lập trình viên Node.js','Ứng viên mẫu có dự án API tuyển dụng.',1,1,1,1,'HYBRID',10000000),
 (3,'Trần Thu Hà','Lập trình viên React','Ứng viên mẫu có dự án giao diện tìm việc.',3,3,1,1,'REMOTE',12000000);
INSERT INTO candidate_educations (candidate_id,school_name,major,degree,start_date,end_date) VALUES
 (2,'Trường Đại học Mẫu','Công nghệ thông tin','Đại học','2022-09-01','2026-06-01'),
 (3,'Trường Đại học Mẫu','Kỹ thuật phần mềm','Đại học','2022-09-01','2026-06-01');
INSERT INTO candidate_projects (candidate_id,name,description) VALUES
 (2,'API quản lý công việc','Dùng Node.js, Express, MySQL; có đăng nhập và phân quyền.'),
 (3,'Website tìm việc','Dùng React, JavaScript, HTML, CSS; có tìm kiếm và lọc tin.');
INSERT INTO candidate_skills (candidate_id,skill_id,proficiency,evidence) VALUES
 (2,1,'INTERMEDIATE','Dự án API quản lý công việc'),(2,2,'INTERMEDIATE','Dự án API quản lý công việc'),
 (2,3,'INTERMEDIATE','Dự án API quản lý công việc'),(2,4,'BASIC','Dự án API quản lý công việc'),(2,6,'BASIC','Quản lý phiên bản dự án'),
 (3,1,'INTERMEDIATE','Website tìm việc'),(3,5,'INTERMEDIATE','Website tìm việc'),
 (3,7,'INTERMEDIATE','Website tìm việc'),(3,8,'INTERMEDIATE','Website tìm việc');
INSERT INTO companies
 (id,user_id,name,description,industry_id,location_id,address,contact_email,company_size,verification_status,verified_at)
VALUES
 (1,4,'Công ty Công nghệ Mẫu A','Công ty giả lập phục vụ đồ án.',1,1,'Địa chỉ mẫu tại Hà Nội','congty1@demo.local','11-50','VERIFIED',UTC_TIMESTAMP(3)),
 (2,5,'Công ty Phần mềm Mẫu B','Công ty giả lập đang chờ admin xác minh.',1,3,'Địa chỉ mẫu tại TP Hồ Chí Minh','congty2@demo.local','1-10','PENDING',NULL);
INSERT INTO job_posts
 (id,company_id,title,description,requirements,benefits,industry_id,location_id,level_id,employment_type_id,work_mode,
  salary_negotiable,salary_min,salary_max,min_experience_months,vacancies,application_deadline,status,published_at)
VALUES
 (1,1,'Fresher Node.js Developer','Xây dựng REST API và tích hợp MySQL.','Có dự án Node.js, Express, MySQL; sử dụng Git.',
  'Được hướng dẫn và tham gia dự án mẫu.',1,1,2,1,'HYBRID',FALSE,9000000,14000000,0,2,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 45 DAY),'PUBLISHED',UTC_TIMESTAMP(3)),
 (2,1,'Junior React Developer','Phát triển giao diện website tuyển dụng.','Biết React, JavaScript, HTML, CSS; có kinh nghiệm dự án.',
  'Làm việc từ xa và được đào tạo.',1,NULL,3,1,'REMOTE',FALSE,12000000,18000000,12,1,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 60 DAY),'PUBLISHED',UTC_TIMESTAMP(3)),
 (3,2,'Thực tập sinh lập trình web',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'ONSITE',TRUE,NULL,NULL,0,1,NULL,'DRAFT',NULL);
INSERT INTO job_skills (job_id,skill_id,is_required,importance) VALUES
 (1,1,TRUE,2),(1,2,TRUE,3),(1,3,TRUE,2),(1,4,TRUE,2),(1,6,FALSE,1),
 (2,5,TRUE,3),(2,1,TRUE,2),(2,7,TRUE,1),(2,8,TRUE,1),(2,9,FALSE,1);
UPDATE job_posts SET address='Địa chỉ mẫu tại Hà Nội' WHERE id=1;
INSERT INTO saved_jobs (candidate_id,job_id) VALUES (2,1),(3,2);
INSERT INTO notifications (user_id,type,title,body,target_path) VALUES
 (4,'COMPANY_VERIFIED','Công ty đã được xác minh','Bạn có thể gửi tin để hệ thống tự động kiểm tra và đăng.','/company/profile'),
 (5,'COMPANY_PENDING','Hoàn thiện hồ sơ công ty','Hồ sơ công ty đang chờ admin xác minh.','/company/profile');
COMMIT;


ALTER TABLE users
  ADD COLUMN username VARCHAR(50) NULL AFTER id,
  ADD UNIQUE KEY uq_users_username (username);
