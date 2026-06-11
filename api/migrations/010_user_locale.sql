-- User-chosen UI language. NULL = never chosen explicitly (the client then
-- falls back to browser detection); set when the user picks a language in
-- the profile. Used server-side for outgoing emails (magic links etc.).
alter table users add column locale text check (locale in ('de', 'en'));
