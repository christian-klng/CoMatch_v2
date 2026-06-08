-- Communities need a publish gate and a short numeric join code that works
-- for both QR scans and manual entry (8 digits, easy to read out / type).

alter table communities add column if not exists published boolean not null default false;
alter table communities add column if not exists code char(8) unique;

-- Backfill the demo community so existing flows keep resolving, and publish it.
update communities
   set code = coalesce(code, '10000001'),
       published = true
 where id = '00000000-0000-0000-0000-0000000000c1';

create index if not exists idx_communities_code on communities(code);
