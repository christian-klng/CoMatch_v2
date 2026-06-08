-- The legacy join_code (a demo URL, NOT NULL) is fully replaced by the 8-digit
-- `code`. It's unused in code now and its NOT NULL constraint broke admin
-- community creation (the insert never supplied it). Drop it.
alter table communities drop column if exists join_code;
