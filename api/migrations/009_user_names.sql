-- Every user gets a first name: match cards and avatars need one. Prefer the
-- first name from an already-imported LinkedIn profile, otherwise assign a
-- random one (same list as the API uses for new signups).

update users
   set name = nullif(trim(linkedin_profile->>'first_name'), '')
 where name is null
   and nullif(trim(linkedin_profile->>'first_name'), '') is not null;

update users
   set name = (array[
     'Alex','Anna','Ben','Clara','Daniel','Elena','Felix','Greta',
     'Hannah','Jan','Johanna','Jonas','Julia','Kai','Lara','Lea',
     'Leon','Lina','Luca','Marie','Max','Mia','Milan','Nico',
     'Nina','Noah','Paul','Pia','Robin','Sarah','Simon','Sophie',
     'Tim','Tom','Valentina','Victor','Yara','Zoe'
   ])[floor(random() * 38)::int + 1]
 where name is null;
