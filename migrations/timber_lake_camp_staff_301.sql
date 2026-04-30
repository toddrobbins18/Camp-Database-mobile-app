-- Import Timber Lake Camp staff from Lovable export
-- Rows after CSV dedupe (company_id + person_id + season): 301
--
-- ON CONFLICT (company_id, person_id, season): merge into existing rows; `id` unchanged on conflict.

BEGIN;

WITH v AS (
  SELECT '1d296ccf-31e1-4176-af57-50a4a4820f82'::uuid AS target_company_id
)
INSERT INTO public.staff (
  id, company_id, created_at, updated_at, name, role, email, phone, department, gender,
  date_of_birth, hire_date, session, season, status, staff_type, allergies, rfid, photo_url,
  person_id, leader_id, division_id, sort_order, specialty_sports, tshirt_size
)
VALUES
(
    '55ab981a-b8b2-49c7-b263-089ad3d1af36'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:07.916051+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Aaron Saleapaga', 'General Counselor', '2aronsaleapaga@gmail.com', NULL, NULL, NULL,
    '2002-05-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20435299', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c1310d95-b818-4994-b32c-ef09beb941d8'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Abbey Johnson', 'General Counselor', 'abbeykjohnson0@gmail.com', '0402595600', NULL, NULL,
    '2001-03-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18889899', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '72ee3786-fd3d-4fbe-bfdc-aa089d2bc956'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Abbie Fitzgerald', 'General Counselor', 'abbiefitzgerald85@gmail.com', '0858053232', NULL, NULL,
    '1999-10-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17306099', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c160d999-a250-4304-a40d-c13d4eff9c11'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Abbie Murray', 'General Counselor', 'amurray17803@gmail.com', '+4407443621483', NULL, NULL,
    '2003-08-17'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19799346', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6eedc05c-2b43-4f7e-8fbc-70bc7e2c10e4'::uuid, (SELECT target_company_id FROM v), '2026-01-29 04:03:58.613131+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Abby Silverman', 'Health Center Administrator', 'abbysilverman@comcast.net', '9172974299', NULL, NULL,
    '1971-04-09'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '1970184', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7e230bb1-f53e-4f48-bbc3-75dd9e542627'::uuid, (SELECT target_company_id FROM v), '2026-04-21 03:04:00.762099+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Adam Boba', 'Webographer', 'adamekboba@gmail.com', '+48604983707', NULL, NULL,
    '2006-01-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20654350', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a2e94c7c-5abe-40b3-a976-af365a29c24b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Adam Finkelstein', 'Junior Counselor', 'arossfinkelstein@gmail.com', '9734765042', NULL, NULL,
    '2008-10-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16972079', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '230cd5d6-4084-44c4-9526-e232491e96bf'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Adrian Gordon', 'Assistant Head Chef', 'agordon0887@gmail.com', '9193497410', NULL, NULL,
    '1987-08-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19551154', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ec891343-568e-4d3c-8b43-956c35406e87'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Adylene Baylon Cuahtlapantzi', 'Laundry/HK', 'adylene.bc@gmail.com', '+522461910909', NULL, NULL,
    '2004-12-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20901018', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '54c2632c-8fb6-42cd-aa84-9f41f51bf835'::uuid, (SELECT target_company_id FROM v), '2026-04-28 03:04:00.474951+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Alejandro Gómez', 'Basketball Instructor', 'alegord2507@gmail.com', '+34690223653', NULL, NULL,
    '2007-01-25'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20698191', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '2870bbd1-820e-4714-a806-1277f412f567'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Alejandro Navarro', 'Lifeguard', 'aletrillo.n@gmail.com', '629406467', NULL, NULL,
    '2006-10-25'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19475197', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1bc8a4d4-15ce-485e-abf0-46271b881103'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Alejandro Rubio Gallardo', 'Tennis Instructor', 'rubio.gallardo.alejandro14@gmail.com', '+34623176728', NULL, NULL,
    '2006-03-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20855214', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3b2051e3-f1ff-4905-8025-f2aade2d5497'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Alexander Sigüenza Mancilla', 'Dining Hall Assistant', 'sigman2006@outlook.com', '+529981448843', NULL, NULL,
    '2006-06-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20896710', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'bd435c8a-20c1-4625-98f6-401c842e936d'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Alicja Sliwinska', 'Laundry/HK', 'alicjasliwinska1911@gmail.com', '+48536294830', NULL, NULL,
    '2003-11-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20902552', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '550c649d-bb83-4892-97e1-8791dc9535cc'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Alistair Curran', 'Outdoor Adventure Instructor', 'alistair.curran@icloud.com', '+447903181132', NULL, NULL,
    '2007-04-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20480036', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '82e582af-1766-4d50-89f1-6361b19dcee9'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Amanda Benvenutti', 'Division Leader', 'Amanda_Benvenutti@hotmail.com', '+55991893886', NULL, NULL,
    '1994-09-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '12259974', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6afb4275-1d8b-4713-a8be-eb86c39cada3'::uuid, (SELECT target_company_id FROM v), '2026-04-28 03:04:00.474951+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Andrea Figueroa', 'Webographer', 'andreafig2005@gmail.com', '+526621942770', NULL, NULL,
    '2005-10-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20611158', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e864023c-90f9-44b1-a91e-fdaadc4cff8d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Andrew Bourne', 'Outdoor Adventure Instructor', 'ajbourney@gmail.com', '+27721027306', NULL, NULL,
    '2003-02-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21129541', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'abc8689a-3ab0-409e-83cf-77e05d2e282a'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Angela Torres', 'Cooking Instructor', 'angelaleslie204@gmail.com', '4074862178', NULL, NULL,
    '2003-11-25'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21050255', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '574f4e05-6e55-4a5a-815c-b582483f6c14'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Anglina Kataria', 'Doctor', 'anglina.kataria@gmail.com', '16468751862', NULL, NULL,
    '1988-08-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19285845', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '04b9899f-0a58-4bc7-b19d-912ad30372e1'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Angus Forbes', 'General Counselor', 'angusforbes2008@gmail.com', '+447554148306', NULL, NULL,
    '2008-02-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21182624', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd6b15921-dc3a-41ad-9f46-07616a05e85e'::uuid, (SELECT target_company_id FROM v), '2026-04-12 04:04:09.988567+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Anna Ciesla', 'Office', 'ania.ci@o2.pl', '+48798747583', NULL, NULL,
    '2001-12-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20515581', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '63f1be40-163d-4aa9-afad-9003059da99f'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Antony Wiles', 'General Counselor', 'acdrw@icloud.com', '+4407918000288', NULL, NULL,
    '2006-06-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21198930', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e0f74e79-2557-4b20-a758-63096b66efb3'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Aoife McKevitt', 'Outdoor Adventure Instructor', 'aoifejmckevitt@gmail.com', '+447375025653', NULL, NULL,
    '2005-10-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18745318', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4c5ef901-c575-4649-94e2-e3da30e2d155'::uuid, (SELECT target_company_id FROM v), '2026-04-27 03:04:06.102479+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Ashlee Jansen', 'Lifeguard', 'ashpashjj@gmail.com', '0716827386', NULL, NULL,
    '2001-02-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20720302', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0a7133f1-2ad6-4855-ba54-c4520d68eee3'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Astrid Elizabeth Vergara Almazán', 'Dining Hall Assistant', 'avergaraalmazan@gmail.com', '2222003023', NULL, NULL,
    '2006-07-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21116808', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '912993f1-80a6-47bb-a8b8-9435de140b4e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ava Gill', 'General Counselor', 'avalouisegill10@gmail.com', '+3530860735369', NULL, NULL,
    '2006-03-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19388197', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f1481f13-510c-4f7c-a3be-e1f7d2937bb0'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ava Schuldhaus', 'General Counselor', 'avaschuldhaus@gmail.com', '7806997823', NULL, NULL,
    '2007-03-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19272657', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0883fcf6-44a2-4d4c-a37e-341aaa699a8c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Avery Kadri', 'General Counselor', 'akk04@outlook.com', '8015161525', NULL, NULL,
    '2004-10-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18855476', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd3ba406c-92e3-4a5c-90b5-e279c79d9d5a'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Aydin Schwetz', 'Hockey Director', 'aschwtzy@gmail.com', '8053587899', NULL, NULL,
    '1999-07-08'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18103227', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b0a482eb-6c54-44f6-8a9f-0e8ce51cc10e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Barnabas Masa', 'Maintenance', 'barnabas.masa@gmail.com', '+36307460862', NULL, NULL,
    '2006-04-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21003720', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'bc6bdb40-7b15-44dd-892d-3e993ab8f8c8'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Barry Sokol', 'Driver/Canteen Manager', 'sokolhouse2@gmail.com', '7329914066', NULL, NULL,
    '1951-05-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '12581838', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6eac8c97-12fa-45b3-b6a0-75bc06a062dd'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.512635+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ben Cohen', 'Junior Counselor', 'bencohen326@gmail.com', '6466600148', NULL, NULL,
    '2009-03-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20496626', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1a210da5-88db-422c-8c95-2dced9af4c71'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Bence Martinek', 'Food Service Assistant', 'martinekbence@gmail.com', '+36305516606', NULL, NULL,
    '2006-08-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21275076', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '58858e14-05b6-4b4a-902e-8796364392aa'::uuid, (SELECT target_company_id FROM v), '2026-04-08 04:04:10.982292+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Bethan Pitt', 'General Counselor', 'bethanpitt07@gmail.com', '07421882860', NULL, NULL,
    '2007-01-30'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20700939', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '935d95e9-98b8-40c3-837b-7a3d0821955f'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Bethany Taylor', 'Division Leader', 'beth.c.a.taylor@gmail.com', '07803343512', NULL, NULL,
    '1997-09-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17331949', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b512b074-dcb6-4fae-ba41-6d6dfd3dbb38'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Borbala Peter', 'Dining Hall Assistant', 'peterborbala21@gmail.com', '+36205535540', NULL, NULL,
    '2004-09-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19352447', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'af2e3f94-1eb8-4cb9-a7fb-4f45c49a7eea'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Braden Sosnik', 'Basketball Assistant', 'bradensosnik@gmail.com', '5163025554', NULL, NULL,
    '2005-05-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2954148', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '499e3e5f-411a-4f22-a874-6fe281d69399'::uuid, (SELECT target_company_id FROM v), '2026-04-13 03:04:07.402884+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Brandon Barkhuizen', 'Lifeguard', 'brandonbarkhuizen7@gmail.com', '+27810378133', NULL, NULL,
    '2006-07-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20532253', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b7e6e7d0-2398-4f5f-938d-35b0e61f6047'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Brendan Reidt', 'General Counselor', 'brendanreidt@gmail.com', '5082826535', NULL, NULL,
    '2007-07-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '3048269', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f4ee5523-aabe-478b-953f-b47a0fbd23c2'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Brianna Maestas', 'Nurse', 'maestasbri@gmail.com', '12088811317', NULL, NULL,
    '1999-05-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20964208', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1dfeb74d-e608-4f53-8ef0-a9217721d577'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Bryceson Minhinnick', 'General Counselor', 'bryceson.m@icloud.com', '6474043804', NULL, NULL,
    '2003-01-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19641129', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '78154bda-624c-43ff-b12a-c8426f838a40'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Callum Ireland', 'Film & Television Instructor', 'callumire@icloud.com', '+447563110696', NULL, NULL,
    '2004-09-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21370372', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'befbfeeb-f560-478e-ad89-ce9471d0d39c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Cameron Greenley', 'Outdoor Adventure Instructor', 'camerongreenley@gmail.com', '+447538124791', NULL, NULL,
    '2004-12-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21109383', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'fc80455c-7751-4e8f-b2b4-1ecc109f5fa4'::uuid, (SELECT target_company_id FROM v), '2026-04-22 04:04:04.242587+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Cameron Page', 'Program Director', 'cameronpage1@hotmail.com', NULL, NULL, NULL,
    '1997-04-30'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '7794765', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7f568003-bebe-468b-98ca-c90123fbc4e3'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Camila Fernandez', 'Pantry', 'camfernandezb06@gmail.com', '3168657765', NULL, NULL,
    '1997-06-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '13701323', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0a4c90d0-4475-42ae-968d-0a3481889fee'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Camryn Reeves', 'General Counselor', 'camrynreeves05@gmail.com', '5125744419', NULL, NULL,
    '2005-01-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18871444', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f1af4f9a-241f-4683-8ec0-ad00eee43e8f'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Candace Stevens', 'Driver', 'cstevens4kidz@gmail.com', '6316725803', NULL, NULL,
    '1972-03-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '8424502', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '616cf5b4-d2f8-4335-870a-469e88b560dc'::uuid, (SELECT target_company_id FROM v), '2026-04-15 04:04:03.894184+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Carla Blanco Kühnel', 'Tennis Instructor', 'carlakuhnel@icloud.com', '+34624232788', NULL, NULL,
    '2007-09-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20677239', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6a139646-5009-40ae-8319-48cad2bca1ac'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Carla Slidel', 'Assistant Waterfront Program Counselor', 'carlaslidel@hotmail.co.uk', '+447495781012', NULL, NULL,
    '1988-04-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20923146', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c6f7083d-3a95-4fdc-afce-0cfd69389b6b'::uuid, (SELECT target_company_id FROM v), '2026-04-14 04:04:02.709043+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Carles Martinez Corralero', 'Fitness Trainer', 'carlesm13@gmail.com', '+34638517273', NULL, NULL,
    '2003-06-08'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20678707', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f52f3fe2-4bb8-4f8f-a722-3b296b9801d0'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.108326+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Carlos Hernandez Cacho', 'Grounds', 'cfhc20001@gmail.com', '2231399508', NULL, NULL,
    '2001-06-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '15340326', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'cbc0c0bf-8614-4bba-a8bc-2604365807d0'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Cayleb Pierson', 'Nurse', 'cayleb2019@gmail.com', '2059556314', NULL, NULL,
    '2001-08-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19480512', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3a0552fb-0768-4a05-a7e3-3e43fe034f66'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Celso Pablo Campoy', 'Program Assistant', 'celsopablocampoy@gmail.com', '6621287567', NULL, NULL,
    '2005-10-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21029073', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4e838baa-a346-490b-9fac-1a32f3fccadd'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Chantel Gregorio', 'Nurse', 'chantel_gregorio@yahoo.com', '+16233770548', NULL, NULL,
    '1996-01-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20370151', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '45f7c5c7-7a02-4903-9dbe-cdd6a58e9159'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Chelsea Hurtado Santos', 'Dining Hall Assistant', 'chelseahurt05@gmail.com', '4775225642', NULL, NULL,
    '2005-05-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21131399', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9a4c9e6e-fa70-45f5-95a9-8b3fe5cd0d84'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Chinenye Ugonabo', 'Nurse', 'chinenye.ugonabo@gmail.com', '9172040810', NULL, NULL,
    '1991-04-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21277124', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e5657d81-7e3d-4ddb-8d6f-2a62130b0076'::uuid, (SELECT target_company_id FROM v), '2026-04-28 03:04:00.474951+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Chloe Sewill', 'General Counselor', 'chloesewill@icloud.com', '07393821786', NULL, NULL,
    '2007-06-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20625785', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '18a6c2a7-4250-463f-8a47-b7182ebd68e6'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Chris Bufalo', 'Assistant Division Leader', 'chrisjbufalo@gmail.com', '0468617450', NULL, NULL,
    '2004-05-17'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16408876', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ae6d65a6-544b-4d53-9967-3737cf30f612'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Christian Lawler', 'General Counselor', 'christianlawler@outlook.com', '07432505784', NULL, NULL,
    '2003-06-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19063487', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '88e140c5-76b5-4225-8f41-4e89f7c15d9b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Clodagh O''Sullivan', 'General Counselor', 'clodaghosullivan261@yahoo.com', '+3530834156078', NULL, NULL,
    '2001-10-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16915608', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6578ba49-af8a-4294-bf20-b8d1e83542bb'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Connor Reidt', 'General Counselor', 'connorreidt@gmail.com', '5084989369', NULL, NULL,
    '2006-03-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '3048268', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7a441256-7be1-4b7a-82cf-63b7e805124b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Cristian Alexis Pulido Hernandez', 'Assistant Chef', 'cristianpulidoalex@gmail.com', '2225877995', NULL, NULL,
    '2001-09-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18856265', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a9cfc33b-df4f-4b42-9e91-d099a958f225'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Csaba Varga', 'Dining Hall Manager', 'varga19csaba19@gmail.com', NULL, NULL, NULL,
    '1989-08-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '3522480', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b8affd4c-80a8-481a-8dfb-95f947a99f3d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'D''Angelo González', 'General Counselor', 'dsg029@shsu.edu', '8328498815', NULL, NULL,
    '2001-10-09'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21165438', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6304bae3-4304-45d5-97aa-d106310b3971'::uuid, (SELECT target_company_id FROM v), '2026-04-22 04:04:04.242587+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Daniel Prussian', 'Junior Counselor', 'ddprussian@icloud.com', '5169875961', NULL, NULL,
    '2009-03-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '8107583', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e68e203b-93f5-424b-bde6-f72dcc3f3ff7'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Daniel Watson', 'Lifeguard', 'danwatson464@gmail.com', '+27662137616', NULL, NULL,
    '2004-11-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19236996', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1e9c1fa0-cac7-4ca8-8779-cc9b5304e1c8'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Daniela Sarai Romero Solis', 'Dishwasher', 'danielasarai.r.s@gmail.com', '2212032471', NULL, NULL,
    '2002-10-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18856083', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '833d224b-2d36-444c-9da7-2451262ecec9'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.341207+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Dara Kotz', 'Junior Counselor', 'darakotz2027@gmail.com', '2017393393', NULL, NULL,
    '2009-02-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '7647920', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '380b20ba-d1c8-4682-91fa-f558a0cea59e'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:08.39039+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Daria Dulska', 'Laundry/HK', 'dariadulska123@onet.pl', '+48517778980', NULL, NULL,
    '2006-08-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20667321', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '31300499-934e-452b-9a29-ba8fd57d26e5'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'David Gaztelu Novak', 'General Counselor', 'David.gaztelunovak@gmail.com', NULL, NULL, NULL,
    '2004-01-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19387334', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9b983419-c335-43f5-a8fd-3cff218722f1'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'David López Santos', 'Robotics/Technology Instructor', 'lopez.santos.david27@gmail.com', '611044430', NULL, NULL,
    '2007-03-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19471551', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4cf7070e-5a40-404a-94eb-bcd5bc4ef70c'::uuid, (SELECT target_company_id FROM v), '2026-04-27 03:04:06.053796+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Dayquan Peterson', 'General Counselor', 'dayquanpeterson2@gmail.com', '+184546448', NULL, NULL,
    '2003-10-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20057399', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '8683f04a-b8f2-4dbb-8b00-0dd582607d31'::uuid, (SELECT target_company_id FROM v), '2026-01-29 04:03:58.613131+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Diana Mukunza', 'Head Nurse', 'dmukunza@aol.com', '4434532187', NULL, NULL,
    '1968-12-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '1957045', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '012da115-66c4-4820-b456-f4e63060b21b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Diego Lopez', 'Tennis Instructor', 'dlobp2006@gmail.com', '+34669758494', NULL, NULL,
    '2006-12-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19313923', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3124c33a-9127-421a-8435-3d0f13544d1b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Dija Rodeviciute', 'Graphic Design', 'dijarodeviciutee@gmail.com', '+37061830703', NULL, NULL,
    '2004-06-08'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21019881', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '044620ef-2db4-4bd0-9993-507214a83b22'::uuid, (SELECT target_company_id FROM v), '2026-04-13 03:04:07.402884+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Dominika Woyda', 'Dining Hall Assistant', 'dominikawoyda@gmail.com', '+48531058405', NULL, NULL,
    '2006-09-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20667320', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '8b34d801-dac5-417e-8162-22686bfca424'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.512635+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Dora Gubi', 'Health Center Assistant', 'gubidora@gmail.com', '+381638333968', NULL, NULL,
    '2005-01-12'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19668473', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c7b56714-7e3c-4d7b-8e98-651d5924140d'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.341207+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Dylan Stanford', 'Junior Counselor', 'dylanbstanford@gmail.com', '2013044114', NULL, NULL,
    '2010-02-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '7778588', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c2425a25-e1c1-4c50-b426-1f8c2647e593'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Dyllan kuhn', 'General Counselor', 'dkuhn2@yahoo.com', '+270768620752', NULL, NULL,
    '2002-07-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21190492', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f75f2f30-059a-4da7-ba9e-f6d8ae8efb95'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Edgar Arvelo', 'Football Director', 'edgar.arvelo@yahoo.com', '9292408618', NULL, NULL,
    '1977-03-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19792991', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b7e85d1d-e709-429e-bfd8-804cdca8a516'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Eduardo Guerrero', 'Assistant Chef', 'edoguerrero26@gmail.com', '+573148240884', NULL, NULL,
    '1991-12-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '11629508', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c4bc4e7a-06f1-45c7-b6fe-3d0351a48956'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Elisabeth Taylor', 'Painting Instructor', 'lizziemtaylor2004@gmail.com', '07943761649', NULL, NULL,
    '2004-10-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21304537', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '283b23a2-2809-4083-8987-0eb920face5a'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ella Jackson', 'General Counselor', 'ellajackson2008@gmail.com', '07447919188', NULL, NULL,
    '2008-04-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20511337', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '97261e15-21b9-438e-a81b-ca2535146d4c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ella Whitfield', 'General Counselor', 'Ellawhitty2005@outlook.com', '+61413272679', NULL, NULL,
    '2005-04-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19416125', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ba2309f5-f9e1-44ee-8e9b-4249a915dbdb'::uuid, (SELECT target_company_id FROM v), '2026-01-27 04:05:24.7289+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Ellen Blacker', 'Waterfront Director', 'trifitcoach@yahoo.com', '9085311722', NULL, NULL,
    '1966-07-25'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2685960', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '22f69dd7-eff8-4a2d-823b-57221c72b449'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Ellen Goneconti', 'Nurse', 'ellengoneconti@gmail.com', '9143290535', NULL, NULL,
    '1955-06-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21076000', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3ba2abdc-585c-41f0-a6a6-7a343a0bbcd1'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ellie Westland', 'General Counselor', 'elliewestland@icloud.com', '07747505448', NULL, NULL,
    '2005-08-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20586838', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'cc5af527-02d2-44e5-9dad-0ca1dfafbcfe'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:08.39039+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Elliot Howells', 'General Counselor', 'ezane9@hotmail.com', '+447484837126', NULL, NULL,
    '2003-01-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20667674', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e2114e13-c46a-45e5-a7e4-9718818b7969'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Elliott Shaw', 'General Counselor', 'elliottshaw124@gmail.com', '07863698866', NULL, NULL,
    '2004-05-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21075503', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '00fda758-d827-4c4c-a4aa-2faa793579e3'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Emelia Mitzi', 'Nanny', 'emitzi3011@gmail.com', '07403674757', NULL, NULL,
    '2004-11-30'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19758096', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b84741cb-13fd-4bba-be4e-089458b5649b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Emile Gelinas', 'Hockey Assistant', 'egelinas17@gmail.com', '8196683669', NULL, NULL,
    '1998-01-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18012461', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f2c9c7fd-c0cc-41d5-bf55-a1e63544dcf1'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Emily Brown', 'General Counselor', 'emilylaurenb26@gmail.com', '+447533069222', NULL, NULL,
    '2006-11-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21158895', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '72521505-55c2-45e6-bd14-e596f7e37ac8'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Emily Corben', 'Camp Mom', 'EmRyan2@GMail.com', '5166619783', NULL, NULL,
    '1986-04-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18978391', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd97e42ac-4bb4-4f8d-ba06-43d46e43d164'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Enda Bracken', 'Assistant Division Leader', 'endabracken208@gmail.com', '0860319856', NULL, NULL,
    '2000-08-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18198599', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '81c779a5-4e34-4906-bf7e-6e8a8b1a1376'::uuid, (SELECT target_company_id FROM v), '2026-04-01 04:04:12.936023+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Eoin Sheehan', 'Golf Instructor', 'eoinsheehan13@gmail.com', '+353874032277', NULL, NULL,
    '2004-12-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20469072', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '30878b74-d9d2-4581-9392-ed013ab9e33c'::uuid, (SELECT target_company_id FROM v), '2026-01-27 04:05:24.7289+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Eric Stein', 'Director of Operations', 'steiny45@gmail.com', '4014218100240', NULL, NULL,
    '1968-07-25'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2685799', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'cceb007f-ae2a-493f-808b-a68bad32da06'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Erin Barrett', 'Outdoor Adventure Instructor', 'erin01barrett@gmail.com', '0421981045', NULL, NULL,
    '2001-09-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19315613', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd4043e5e-6e41-484d-accb-4c2af4223e65'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Erin Gemmell', 'General Counselor', 'erin.gemmell2006@icloud.com', '07494371218', NULL, NULL,
    '2006-02-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21240751', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '27035d55-979d-4f93-aa88-a8004b1677bf'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Esteban Gándara', 'Elective Center Coordinator', 'estebangr661@gmail.com', '+526621679721', NULL, NULL,
    '2005-08-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18526971', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3338c833-3a3f-41ed-b74c-7fa6c7de80f0'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Ewelina Kowalcze', 'Pantry', 'eweka7526@gmail.com', '+48570538940', NULL, NULL,
    '2005-05-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20895325', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '47ab1a6c-2ae5-4cef-a685-a58af44e7146'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Felicity Aynsley', 'Division Leader', 'Felicity@beethamhall.co.uk', '+447483172003', NULL, NULL,
    '2003-05-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18589510', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3f7675bb-94ee-4c59-af8a-e1c6c9f92bff'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Finn Simon McCarthy', 'General Counselor', 'finnmcc103@gmail.com', '+3530838418213', NULL, NULL,
    '2003-12-30'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17310030', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c9737260-7874-4d89-acda-61f72d46156e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Francesca Hanson', 'Assistant Division Leader', 'franhanson@hotmail.com', '07724631363', NULL, NULL,
    '2002-11-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '15374929', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b3a43ce6-c9c9-4fa9-8bf1-00a1e85414e2'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Francesca Shires', 'Lifeguard', 'fhshires@sky.com', '+447874081410', NULL, NULL,
    '2004-07-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20876585', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '928ebca0-8df9-47e3-8f1e-3600c069966f'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.341207+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Francis Sirois', 'Boys Head Counselor', 'franc.sirois12@gmail.com', '5064769182', NULL, NULL,
    '1993-10-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '7368344', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '2a79f99e-61f8-40f0-aaec-4a849d5a4aa2'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Frankie Drennan', 'Dance Instructor', 'frankiedrennan@mail.com', NULL, NULL, NULL,
    '2007-02-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20960898', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '93f46082-20b2-446a-996f-edefcd52e9d5'::uuid, (SELECT target_company_id FROM v), '2026-04-27 03:04:06.053796+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Freya Eddleston', 'General Counselor', 'freyaeddleston@icloud.com', '+447703894510', NULL, NULL,
    '2005-10-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19577367', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c03b0a0d-7b63-46ea-973e-31a04a3997b8'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Frida Rodriguez Salazar', 'Dining Hall Assistant', 'alejo.frida2902@outlook.com', '+525583522355', NULL, NULL,
    '2004-02-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19392087', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1cda1388-03af-408b-81b7-c564250057b2'::uuid, (SELECT target_company_id FROM v), '2026-03-20 04:04:00.973519+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Gabriel Sjouerman', 'Operations', 'gabe.sjouerman@gmail.com', '0618700200', NULL, NULL,
    '2002-02-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20684464', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ba8cd5ba-f066-410c-b1e3-d2bccee1077e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Gabriella Nash', 'Lifeguard', 'gabriella.nash05@icloud.com', '07717606342', NULL, NULL,
    '2005-09-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19477743', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '244d4018-5b12-4c8f-94c7-e0f9099ebc2b'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Gabrielle Ellis', 'General Counselor', 'gabrielleellis225@gmail.com', '+447465212595', NULL, NULL,
    '2006-01-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20543664', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e4271d4a-13ed-455e-993f-dbcb9288ce8e'::uuid, (SELECT target_company_id FROM v), '2026-04-27 03:04:06.102479+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Grace Thurston', 'Lifeguard', 'gracethurston5@gmail.com', '+4407796508325', NULL, NULL,
    '2006-10-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20696046', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'bdd470ae-745f-4be6-9e03-bb630562d7ba'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Grayden Kanover', 'Junior Counselor', 'gkanover@icloud.com', '5162343899', NULL, NULL,
    '2008-12-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '9631056', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '79054556-c42f-4ee6-b5e3-c8de0f716043'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Guinevere Tobias', 'General Counselor', 'Gwen.ht@icloud.com', '6268086572', NULL, NULL,
    '2003-06-16'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '14754691', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '03913274-9ce9-4b10-bf2c-02c460de7955'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Halima Gargis', 'Division Leader', 'Halkam46@gmail.com', '2566832536', NULL, NULL,
    '1996-12-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '9057579', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c3159a78-0cd2-4478-aaab-d76815ff4727'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Halle Porter', 'General Counselor', 'halleporter29@gmail.com', '+447920037035', NULL, NULL,
    '2005-03-16'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21375070', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '13f9ad62-095e-4e3e-8891-8ca313757a29'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.156279+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Hannah Bolger', 'General Counselor', 'hbolger05@gmail.com', '+353872615244', NULL, NULL,
    '2005-10-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20510044', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b6c9f373-0f1d-4917-9fde-d3af09f8f448'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.495688+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Hannah Engerran', 'General Counselor', 'hannah.engerran@btinternet.com', '+447858042422', NULL, NULL,
    '2002-03-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20827754', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'dee51f56-f0c7-413b-941e-637b5812e40b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Hannah Mindum', 'Assistant Division Leader', 'hmindum@gmail.com', '+61487155721', NULL, NULL,
    '2000-03-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21058411', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a305b676-f35b-4f75-9793-8e22ae3294ac'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Hannah O''Brien', 'Junior Counselor', 'hannah.obrien09@icloud.com', '3473068173', NULL, NULL,
    '2009-03-12'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '11145053', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '34222adf-2cfe-4c4a-a5e5-8e0c09f9c95e'::uuid, (SELECT target_company_id FROM v), '2026-04-27 03:04:06.053796+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Hannah O’Donnell', 'General Counselor', 'hannahodonnell2828@gmail.com', '0861408818', NULL, NULL,
    '2006-05-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20441267', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a1988d79-969d-44e9-b7e0-c36190cddd33'::uuid, (SELECT target_company_id FROM v), '2026-04-19 03:04:07.571752+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Hannah Watt', 'General Counselor', 'hannahaffrica@gmail.com', '0718677493', NULL, NULL,
    '2001-07-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20713547', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '570f4d4b-6280-4823-8ceb-22bdd52f1114'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Harry Richardson', 'General Counselor', 'harryalexander3231@gmail.com', '07982168256', NULL, NULL,
    '2005-09-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21268196', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '55411d2e-8a57-46db-8c7e-e703d06928da'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Harry Stafford', 'General Counselor', 'harrystafford279@gmail.com', '+3530838232021', NULL, NULL,
    '2004-06-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19365247', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '04eb61af-cf16-4804-a80b-8265111d7a74'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Hayley Phoel', 'Office', 'hayley.phoel@gmail.com', '5163531419', NULL, NULL,
    '1982-03-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19022911', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '68279dc6-414f-4621-bae5-72c660a6fa3f'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Heidi Pitt', 'Webographer', 'heidivpitt@gmail.com', '07401240532', NULL, NULL,
    '2008-02-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21005007', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1d8cd958-86d7-4386-b041-fb9d16ac0dd4'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Heidi Stevens', 'Junior Counselor', NULL, NULL, NULL, NULL,
    '2009-03-17'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '8504547', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3865a429-3224-43dd-b048-6a6772690a62'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.512635+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Hope Moir', 'Fitness Trainer', 'hope.moir2007@gmail.com', '+447484191371', NULL, NULL,
    '2005-12-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20538119', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '86580cb7-6443-4cfa-a582-14e53bff1740'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Imade Sallami', 'General Counselor', 'ideswork9@gmail.com', '4385059997', NULL, NULL,
    '2005-01-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21194416', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9b3e8c9f-7bff-4592-adda-a97b60d77fde'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Imogen Llewelyn', 'Woodshop Assistant', 'imogen.r.llewelyn@gmail.com', '+447897325872', NULL, NULL,
    '2007-04-08'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20521152', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '99ef1e54-366b-4dc0-b09e-f3d002790871'::uuid, (SELECT target_company_id FROM v), '2026-04-26 04:04:01.287173+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Imogen Stanworth', 'Gymnastics Instructor', 'imogen.stanworth@gmail.com', NULL, NULL, NULL,
    NULL, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20695177', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3e66f5d6-a88a-4120-a74f-f174cc695a17'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ingrid Fernandez Martin', 'Tennis Instructor', 'fernandezmartiningrid@gmail.com', '684258203', NULL, NULL,
    '2006-09-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19315756', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'dd346e75-4e51-4a19-a5c8-c2466a07f665'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.791014+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Isabel Hodson', 'General Counselor', 'ihodson06@gmail.com', '07984556584', NULL, NULL,
    '2006-09-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20720910', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '581baaac-c729-4a84-bf28-d4fcbded3fb4'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Ishrael Rickli de Carvalho', 'Outdoor Adventure Instructor', 'ishraelrc@gmail.com', '+5492944344210', NULL, NULL,
    '1991-11-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21188464', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '25a381ba-b20a-4e0a-ab07-c131ef2be2f6'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Isobel Ridgers', 'General Counselor', 'isobel@ridgers.co.uk', '+61444565799', NULL, NULL,
    '2006-12-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19326624', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '5651f6b3-bc20-4097-8537-9d9481f1ae1d'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jack Bailenson', 'Junior Counselor', 'j.bailenson@icloud.com', '5612715363', NULL, NULL,
    '2009-08-09'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '9653005', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'eea67a4f-6bc7-4e16-9399-ba9c6a106541'::uuid, (SELECT target_company_id FROM v), '2026-01-27 04:05:24.7289+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jackie Diamond', 'Associate Director', 'jackie@camptlc.com', '5165327666', NULL, NULL,
    '1986-10-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2583125', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a5575f59-e28e-461b-b376-fde465f92cea'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.204977+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jackson Henry', 'Grill Master', 'jkh86203@gmail.com', '12038171796', NULL, NULL,
    NULL, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20975438', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '2e7bfb62-386e-42be-9d7d-4216c68fbf79'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Jacob Solan', 'General Counselor', 'jacobsolan303@gmail.com', '+353858588580', NULL, NULL,
    '2005-09-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20533804', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '524c538e-7af8-47dd-98d7-c213c8caed3e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jade Reid', 'Outdoor Adventure Instructor', 'jadeareid21@gmail.com', '0452482106', NULL, NULL,
    '2007-06-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21037704', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b56265b3-3169-41d8-9141-55a19a71b05d'::uuid, (SELECT target_company_id FROM v), '2026-04-26 03:04:04.611201+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Jaimie Glick', 'Doctor', 'jaimieglickmd@gmail.com', '15163133175', NULL, NULL,
    '1984-07-12'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19691875', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9d53fde2-80aa-472e-a705-486120e19407'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.108326+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'James Schlottman', 'Athletic Coordinator', 'jschlo4@lsu.edu', '9857897842', NULL, NULL,
    '2002-02-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '15265765', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '95015361-f153-4437-82ba-d54696f2baa5'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'James Sinclair', 'General Counselor', 'James.sinclair115@gmail.com', '07481386663', NULL, NULL,
    '2003-11-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20475458', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f7c95289-9df8-49dc-8a41-06db45a7456d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jamie Barr', 'Theater Instructor', 'jamietbarr02@gmail.com', '07711599592', NULL, NULL,
    '2002-06-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '15712206', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '60d49c04-afb4-4ee6-90a2-b9e953f10fac'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Jaroslaw Lenart', 'Dining Hall Assistant', 'jarek.lenart140@gmail.com', '+48791220468', NULL, NULL,
    '2002-04-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20518293', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '35f21da4-3535-47bf-9d1f-a42f039e272e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jesse Corben', 'Boys Head Counselor', 'JessMan1119@aol.com', '5168576185', NULL, NULL,
    '1986-11-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18978393', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '8341371f-966a-4230-9372-2f011ef4a25d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jessica Itzinger', 'Webographer', 'jessicaitzinger@gmail.com', '+447759507627', NULL, NULL,
    '2005-08-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21303820', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0a53e81d-9f68-4dd0-ba34-c42e4786867c'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jesus Arroyo', 'Athletic Director', 'jesusarroyoreino@gmail.com', '01134918940465', NULL, NULL,
    '1984-12-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '3052629', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'bbfb592a-24d3-4256-b0ed-7505db6e8505'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jesus Galan Molina', 'Videographer', 'jgalanmolina95@gmail.com', '+34664654272', NULL, NULL,
    '1995-12-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16944049', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '81d92e83-e7b5-43f1-b7b9-75600e51f56d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jingtong Li', 'Webographer', 'jingtong.li@foxmail.com', '+8613297005075', NULL, NULL,
    '2002-02-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21125941', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0c6f8746-ab3b-49ea-b837-b499cf2f9c8b'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jinyi Cai', 'Webographer', 'hyggeee@qq.com', '+8615179142650', NULL, NULL,
    '2005-07-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21125690', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '87aea875-5f9e-4a3a-b5bc-978a405e6c7e'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.512635+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Joe O''Sullivan', 'General Counselor', 'joeeos999@gmail.com', '+3530873474247', NULL, NULL,
    '2005-12-12'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20533833', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '30b25a7e-05bc-4275-b695-ab0c6842d6bc'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:07.916051+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Joel Buchanan', 'Basketball Instructor', 'jwjbuchanan@icloud.com', '+642041790238', NULL, NULL,
    '2007-06-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20435439', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '68e49316-e782-46ee-90b9-b09879864cd5'::uuid, (SELECT target_company_id FROM v), '2026-04-22 04:04:04.404309+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Joel Mera Thompson', 'General Counselor', 'joui2020@gmail.com', '+34664612861', NULL, NULL,
    '2004-04-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20854742', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'bb43c72a-c098-4a44-8d49-232aadcf4817'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'John Schofield', 'Program Leader', 'johnschfld@gmail.com', '+27794608381', NULL, NULL,
    '1975-05-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17149497', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0fef92ae-9dad-4a67-b794-9ba471e14f00'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jolene Jordhamo', 'Group Leader', 'jolene.e.jordhamo@gmail.com', '9179933337', NULL, NULL,
    '2007-05-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17947013', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4421a8a0-7bb2-4383-8f66-eeac44276401'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jonah OBrien', 'General Counselor', 'obri16602@gmail.com', '12033924880', NULL, NULL,
    '2006-02-12'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21284066', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '91bb2125-413d-4cc9-b039-58a463610326'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jonathan Grove', 'General Counselor', 'grovejonathan597@gmail.com', '+27662262331', NULL, NULL,
    '2004-10-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18089301', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a6159e66-cc16-416b-9988-d27b0eb725a0'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jonathan Smyth', 'General Counselor', 'jamessmyth4567@gmail.com', '+447477484884', NULL, NULL,
    '2004-06-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21340586', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'caa05280-0b6e-40bb-b489-b8184095b97f'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Jordan Siegel', 'General Counselor', 'jordannoahsiegel@yahoo.com', '5168405001', NULL, NULL,
    '2008-07-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '11368677', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'baf1b28e-f807-4b62-8fe4-1d17ea8c71e0'::uuid, (SELECT target_company_id FROM v), '2026-04-08 04:04:10.982292+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Jose Gomez Cruz', 'Maintenance', 'luisgp0312@gmail.com', '+527713663505', NULL, NULL,
    '2005-12-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20701155', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '37a71a99-1373-42e2-b727-5de681b9af07'::uuid, (SELECT target_company_id FROM v), '2026-04-21 04:03:58.072887+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Joshua López Rojas', 'Potwasher', 'lopez.rojas.joshua.3b@gmail.com', '+522229579005', NULL, NULL,
    '2006-10-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20767026', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '41447977-6221-4af4-8429-e9cf94d7bf68'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Juan Pablo Sánchez González', 'Dining Hall Assistant', 'juanp.sg@hotmail.com', '2722152631', NULL, NULL,
    '1999-05-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19325237', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9afb2aeb-2e80-4aeb-b475-7b9cb78db32d'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Juan Rebolledo Almeida', 'Maintenance', 'juanpablo.rebolledo53@gmail.com', '+573106236814', NULL, NULL,
    '2004-10-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20894946', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a7474e64-ab0f-49c8-b786-11d30f74b40c'::uuid, (SELECT target_company_id FROM v), '2026-04-21 03:04:00.701811+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Juan Reyes', 'Laundry/HK', 'juanestebanreyesq2006@gmail.com', NULL, NULL, NULL,
    '2006-06-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20533625', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1d36eb64-5885-4df9-a15e-a18f13d7bec3'::uuid, (SELECT target_company_id FROM v), '2026-04-26 03:04:04.611201+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Julien Mitilien', 'Potwasher', 'julienmitilien@yahoo.com', '9149547978', NULL, NULL,
    '1986-05-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20113991', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd82b87e2-b632-4d6a-9cd0-34eb1552258c'::uuid, (SELECT target_company_id FROM v), '2026-02-24 21:04:01.29242+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Justin Kaner', 'Doctor', 'kaner529@gmail.com', '5163757445', NULL, NULL,
    '1987-05-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2429139', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1df6c23a-85a0-46ca-b64d-14bfb10c25cc'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.156279+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Júlia Enyedi', 'Dining Hall Assistant', 'enyedi.julia@gmail.com', '06709040532', NULL, NULL,
    '2006-04-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20565810', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '194f764c-c7e7-424e-ae13-82894b6d868d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Kaitlyn McNeill', 'Group Leader', 'kaitlynmcneill@outlook.com', '07713741386', NULL, NULL,
    '2003-12-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17938492', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9aeb71f7-a208-42da-9d7f-d7d5873b70a4'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Karina Sankowska', 'Laundry/HK', 'karinasankowska@gmail.com', '+48534775191', NULL, NULL,
    '2004-01-12'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20904625', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b34cc5d2-97d0-4937-ac5e-f44dfd3d2dae'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Kelly Collins', 'Nurse', 'mcjevvy@gmail.com', '5712333081', NULL, NULL,
    '1995-09-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16932998', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b4e8b126-903a-475c-b506-25f12866a483'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Kelsey Sirois', 'Girl''s Athletic Director', 'Kelsey.tucker99@gmail.com', '5064765547', NULL, NULL,
    '1991-12-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '6099055', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b75be466-0fc5-4fbe-9d95-db55bb64f638'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Lauren Deegan', 'General Counselor', 'laurendeegan53@gmail.com', '0857433113', NULL, NULL,
    '2008-02-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20585848', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a2f9523e-69f2-426a-badc-1ff6c395714c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Lauren Talley', 'Videographer', 'laurentalleymedia@gmail.com', '8035265090', NULL, NULL,
    '2001-11-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20484859', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '78205788-fb2c-41b3-9089-806bee0c201d'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.495688+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Lidia Linde', 'General Counselor', 'lidialinde123@gmail.com', '+34686594384', NULL, NULL,
    '2007-12-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20822769', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7d3cb11c-b625-4bb9-a265-7bcb39e5bfcb'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:07.916051+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Lillian Hayman', 'Creative Crafts', 'lilhayman@gmail.com', '2156781598', NULL, NULL,
    '2002-10-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20469407', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c09ab8c7-a7b9-41ea-b7be-ca6990dcb14f'::uuid, (SELECT target_company_id FROM v), '2026-03-08 03:03:59.475629+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Lisa Sokol', 'Woodshop', 'sokolhouse@gmail.com', '7329914061', NULL, NULL,
    '1956-08-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2685963', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '5e1e80d5-d460-400f-b239-b2ee6d70792c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Lissi Glick', 'Division Leader', 'Lissi@camptlc.com', NULL, NULL, NULL,
    '1992-10-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '15548656', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ad7fdcad-7b87-4307-a6c5-16356f8e257d'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:07.916051+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Lizeth Salas Mancillas', 'Laundry/HK', 'lizeth-sm@hotmail.com', '8441258187', NULL, NULL,
    '2001-04-09'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20192131', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd49300e1-85ff-4bde-adb4-54e99b12f9d7'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Lucas Taylor', 'General Counselor', 'lucasrtaylor04@gmail.com', '+4407368578598', NULL, NULL,
    '2004-07-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21198944', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'afa2342c-4edd-4b89-9669-77a11114d842'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.204977+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Lucy Anderson', 'Ceramics Instructor', 'lucymay218@icloud.com', '5304003736', NULL, NULL,
    '2006-02-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20966195', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '33508b5a-3df3-41a8-a3c9-d698a118f400'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Lucy Fyffe', 'General Counselor', 'lucyfyffe04@gmail.com', '+4407548919842', NULL, NULL,
    '2004-03-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20532252', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7f824f2e-44f3-4833-99c9-97869d489b64'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Luke Rabkin', 'Junior Counselor', 'luke.rabkin1@icloud.com', '5617240929', NULL, NULL,
    '2009-05-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '9655976', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3c145be3-2b6f-4d5a-9910-7bb8fcda22e4'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'MICHAEL GOLBA', 'Assistant Chef', 'mtgchef@gmail.com', '7166099184', NULL, NULL,
    '1956-09-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17392835', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '768d2d4a-8b6a-4f51-9c4b-a50b07ae05e8'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'MIGUEL ANGEL CANADAS ESPINAR', 'Tennis Director', 'mcanadas@gmail.com', '+34674246958', NULL, NULL,
    '1980-06-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20956269', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ae30a674-020e-415b-9375-cbbbaf7b3353'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:08.39039+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Magdalena Nowak', 'Pantry', 'mag.now568@gmail.com', '536703394', NULL, NULL,
    '2002-01-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20781291', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c845b1bc-5b24-497d-a9b5-e7a6d30747df'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Maggie Watt', 'General Counselor', 'mwattdance2006@outlook.com', '0492825370', NULL, NULL,
    '2006-09-09'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20358684', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e2734024-125d-42c7-bd9d-b664246bb4bd'::uuid, (SELECT target_company_id FROM v), '2026-04-21 04:03:57.993429+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Maia Lewis', 'Lifeguard', 'msmlewis@icloud.com', '07555430631', NULL, NULL,
    '2006-09-25'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20541630', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '911a7015-26f6-48aa-b06d-8544cbeb1cbc'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Mairead Mahoney', 'General Counselor', 'mairead.mahony04@gmail.com', '+3530838711027', NULL, NULL,
    '2004-07-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19793344', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '188690b1-28f6-4539-b8f7-6a636930990e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Maisie Hill', 'Group Leader', 'maisieh80@gmail.com', '07368440291', NULL, NULL,
    '2004-01-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17858820', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '33bbf74d-bf9b-4577-9126-b8ada8fa35fa'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Manuela Mazzola', 'Photography Instructor', 'manucheerlaaf@gmail.com', '+393519468445', NULL, NULL,
    '2001-10-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21109728', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd49e13d7-ea2b-4247-b498-ecd3f42a435c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Marc Pina Menendez', 'Soccer Director', 'marcpinamenendez@gmail.com', '+34646086194', NULL, NULL,
    '2000-04-16'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16556074', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6879a5d2-d531-4ef6-bf16-8274b8db27e9'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Marc-Antoine Caillis', 'Lifeguard', 'marcantoinecaillis@gmail.com', '+330767125712', NULL, NULL,
    '2005-07-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21218822', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '997c53e8-30c8-4019-982c-ecd8d9283239'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Marcel Moore', 'Assistant Head Chef', 'mrmarcelmoore@gmail.com', '9197583702', NULL, NULL,
    '1977-06-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19572847', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ca73c1f6-ab6c-444f-855b-be996f057e94'::uuid, (SELECT target_company_id FROM v), '2026-01-27 04:05:24.7289+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Marcy DeBiccari', 'Office Manager', 'mdebiccari@hotmail.com', '9176705855', NULL, NULL,
    '1978-04-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2429121', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'aaa13e7e-01e3-463c-b528-27c3295ce4bb'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Marek Doyle', 'General Counselor', 'marekdoyle2006@gmail.com', '+353830148040', NULL, NULL,
    '2006-06-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21090264', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '02e598a5-0da6-4b45-a810-16b1bcab59a5'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.156279+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Martina Salvador del Águila', 'Jewelry Instructor', 'salvadormartina16@gmail.com', '+34665877182', NULL, NULL,
    '2006-02-16'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19530067', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9fe92e8f-619b-435d-8b58-5393a00027bf'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Martín Hernández Cacho', 'Maintenance', 'martin.her.cacho@icloud.com', '+522211902955', NULL, NULL,
    NULL, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20539403', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b5cff7d1-986d-43d0-b448-5be96d575220'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Mateusz Kawik', 'Maintenance', 'mateusz.kawik13@gmail.com', NULL, NULL, NULL,
    '2001-08-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20573016', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '5b0376c0-21a8-4e1b-8460-5e5b9bc19aab'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Mateusz Moskala', 'Dining Hall Assistant', 'mateuszmoskala14200@gmail.com', NULL, NULL, NULL,
    '1997-11-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20223179', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'df6844e0-1325-4353-951e-2d8f065f4f5a'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Mathieu Billard', 'Tennis Instructor', 'mathieub2004@gmail.com', '+33652200223', NULL, NULL,
    '2004-09-25'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19315722', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '8e5ca9b9-7a60-45e8-89f6-80e69db25754'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Mathilda Dobson', 'Candles Instructor', 'mathildamaydobson@gmail.com', '07384850903', NULL, NULL,
    '2005-07-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20618153', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3baf602e-5d8b-4724-8ce5-12a403c75619'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Matthew Kanover', 'Junior Counselor', 'mkanover@icloud.com', '5167178856', NULL, NULL,
    '2008-12-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '9631029', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '79ff212c-2fd2-4429-a06d-d6699943cbae'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Matthew Mitchell', 'General Counselor', 'matthewnmitchell@gmail.com', '+447599052295', NULL, NULL,
    '2002-09-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20563783', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ffaebcdb-5517-4507-b022-29ba3f4921f6'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Matthew Toughey', 'Lifeguard', 'imattoughey2@gmail.com', '+27671291517', NULL, NULL,
    '2004-08-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19307487', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c46ad6af-0a1a-44d4-b82d-1b09fb5cfdf3'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Mauricio Ardaya', 'Assistant Chef', 'mauricioardaya@gmail.com', '+18633302330', NULL, NULL,
    '1979-10-16'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21007041', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '32c38553-e3a5-4ded-a5b4-20fe19bfa7a3'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Max Schoenberg', 'Junior Counselor', 'schoenbergmax@gmail.com', '5168138400', NULL, NULL,
    NULL, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20481144', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'eb3f193d-0b94-40cb-8a0e-2d31600812a7'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Maxwell Rovner', 'Lacrosse Director', 'mrovner33@gmail.com', '5166680233', NULL, NULL,
    '1999-08-09'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19219036', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7372c352-083b-403f-b8e7-dc020e4c852f'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Megan Haggerty', 'Special Foods Chef', 'haggertymegan0@gmail.com', '8508250880', NULL, NULL,
    '1995-12-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21263890', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a874529b-d353-4200-88db-5b559f210bbf'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Merrick Elias', 'Doctor', 'merrickelias@gmail.com', '9176585261', NULL, NULL,
    '1973-06-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20939265', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7e905473-bb1c-4ee9-b470-d07a8b5c2b18'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Michael Coksakalli', 'General Counselor', 'mronaldo30@icloud.com', '7732304155', NULL, NULL,
    '2005-02-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20079280', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b9a543e0-99d4-4c3c-a422-61a41d1ce749'::uuid, (SELECT target_company_id FROM v), '2026-03-08 03:03:59.475629+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Michele Reidt', 'Nurse', 'michelereidt@gmail.com', '5088786714', NULL, NULL,
    '1973-05-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '3048251', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '1f5297b7-e94f-4c87-bce5-7604db29a4b2'::uuid, (SELECT target_company_id FROM v), '2026-04-24 16:04:00.568608+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Mindy Jacobs', 'Director', 'mindy@camptlc.com', '5166922888', NULL, NULL,
    '1959-07-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '1976222', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'aa201d00-5ebf-430c-8eb7-4a66614982ed'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Molly Weston', 'General Counselor', 'mollyweston1@icloud.com', '+447706749926', NULL, NULL,
    '2004-11-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19280268', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '39dec676-ad3d-4042-8205-88bf98dca0c8'::uuid, (SELECT target_company_id FROM v), '2026-04-27 03:04:06.102479+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Monika Maslanka', 'Office', 'monikamaslanka2@gmail.com', '+48459453227', NULL, NULL,
    '2002-04-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20606050', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6432e7d8-5df5-4911-b00a-59a876cbca25'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Myles Taylor', 'music instructor', 'mtarts015@gmail.com', '14104120333', NULL, NULL,
    '2005-03-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20468513', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ea221165-7425-4c2a-8db7-633d14c9934e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Myriam Valcourt', 'Division Leader', 'mvalcourt00@gmail.com', '15062355661', NULL, NULL,
    '2000-12-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21273841', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '05a0721c-219d-45d9-b3e5-6547339c3b95'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Naomi Martinez Romero', 'Pantry', 'yetzelimtz@hotmail.com', '+522283170377', NULL, NULL,
    '2004-07-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19315583', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '07cf5f5c-3ed8-4e85-bd3a-48264f29f168'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Natalia Perez', 'Laundry/HK', 'natp7740@gmail.com', NULL, NULL, NULL,
    '2007-03-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21011538', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c30d8940-7475-4b2d-83fc-8c4e40ab3acf'::uuid, (SELECT target_company_id FROM v), '2026-04-24 03:04:08.39039+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Natalia Santos', 'Program Assistant', 'nsantos8972@gmail.com', '6621303476', NULL, NULL,
    '2005-10-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20798396', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9637ff94-991f-44e2-b0c3-4feb1e3ec691'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Natasha Strutt', 'General Counselor', 'natashastrutt05@gmail.com', '+447488309719', NULL, NULL,
    '2005-02-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21098465', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '5b5315a8-1d25-478b-9625-b50f02217792'::uuid, (SELECT target_company_id FROM v), '2026-04-19 04:04:09.675152+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Nathan Black', 'General Counselor', 'nfgblack06@gmail.com', '+4407984059362', NULL, NULL,
    '2006-02-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20484718', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'bc404998-ec2d-42dc-8e2a-d1612ad00fdb'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Nathan White', 'Program Director', 'nathan@camptlc.com', '07805357690', NULL, NULL,
    '1992-09-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '4814797', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a8565ecc-0369-4aef-a885-9dc59af6f789'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Nathaniel McCready', 'General Counselor', 'nwmccready@gmail.com', '+447717094552', NULL, NULL,
    '2004-12-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21188463', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '59c9d379-a6e1-4963-bbbd-e6ecfcd82e5f'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Nico Wilson', 'General Counselor', 'nicowilson148@gmail.com', '+447852391379', NULL, NULL,
    '2004-10-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19286217', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'fcbfb471-6248-44b8-b316-98f13476ef43'::uuid, (SELECT target_company_id FROM v), '2026-04-28 04:04:06.108326+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Noah Barron', 'Division Leader', 'noahbarron66@gmail.com', '5192599005', NULL, NULL,
    '1999-06-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '15210308', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '29a11f91-32d5-49c2-afbb-053816f56713'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Nora Chrenoczy Nagy', 'Steward', 'nonon347@gmail.com', '305853030', NULL, NULL,
    '2001-07-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16771808', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '5ef8efb1-1e14-4e92-93dc-2a0ee1556ae0'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Noël Pirson', 'General Counselor', 'pirsonoel@gmail.com', '+32471065162', NULL, NULL,
    '2004-04-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21218821', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0a92eefb-d5b4-4c5e-b9fa-7da8d40b8020'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Oliver Davey', 'General Counselor', 'oliver1058@icloud.com', '+447748669851', NULL, NULL,
    '2008-05-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21094769', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4fd4d737-4713-44c3-8369-4c0ac5bbf485'::uuid, (SELECT target_company_id FROM v), '2026-01-28 04:05:29.60672+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Oliver Hazen', 'Food Service Director', 'oliver@oliverhazen.com', '5164971377', NULL, NULL,
    '2006-10-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '3965155', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '09b702c6-ace1-4005-8c58-8583721a309b'::uuid, (SELECT target_company_id FROM v), '2026-04-18 03:04:13.505204+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Oliver Stepien', 'Lifeguard', 'oliver.stepien@gmail.com', '+447846942391', NULL, NULL,
    '2007-03-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20439490', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '704ff4c2-2bfd-4916-807c-ff273ecb433a'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Olivia Kelly', 'General Counselor', 'oliviakelly15@outlook.com', '07984029423', NULL, NULL,
    '2006-08-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20577561', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '8939bec3-89a2-4702-a4f2-1056a8105e3b'::uuid, (SELECT target_company_id FROM v), '2026-04-28 03:04:00.413298+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Olivia Liddell', 'General Counselor', 'olivia.liddell@icloud.com', '+4407894795247', NULL, NULL,
    '2004-07-19'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19736900', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'fc424921-1eea-4816-98f9-a4b43ea67188'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Olivia Watt', 'Group Leader', 'livwatt18@gmail.com', '0412633920', NULL, NULL,
    '1999-05-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16519087', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '75c89808-0b28-4938-921a-1c200b54f42d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Oscar Livingston', 'General Counselor', 'oscar_liv@outlook.com', '07413327499', NULL, NULL,
    '2007-08-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21266507', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c6c17f91-ef56-4ba1-bdda-af308449d934'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Paris Clarke-Hippsley', 'General Counselor', 'parisdance315@icloud.com', '07714618205', NULL, NULL,
    '2005-03-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17946200', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '2a29d4cc-5be3-43fd-ae2e-22abb5f36b7d'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Patricia Gómez de Liano', 'Tennis Instructor', 'gomezdelianopatricia@gmail.com', '+34669665635', NULL, NULL,
    '2006-12-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19332844', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0e1a1a14-dac3-4220-8313-f6732ad059b2'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Paula Bracho Nuno', 'Pantry', 'paula03bn@icloud.com', '+523323845332', NULL, NULL,
    '2004-01-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20487221', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'afeb0b10-194c-49b4-b753-ec8f034b44a9'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Pauline Reichelt', 'Gymnastics Instructor', 'reicheltpau@gmail.com', '+4916093094889', NULL, NULL,
    '2003-06-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20485245', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '152ae501-19e8-4fb0-abc0-8a1b5f125872'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Rafael Martínez de Morentin Sánchez', 'Tennis Instructor', 'rafamms06@gmail.com', '+34693501747', NULL, NULL,
    '2006-04-15'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20855218', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd196d0e8-9e15-4c73-bce2-cbf236cb0d29'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Raggy Sharma', 'General Counselor', 'raggysharma@hotmail.com', '+16472306458', NULL, NULL,
    '2001-11-09'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16785448', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '44336c85-4337-4aed-81de-86cb323b6bbb'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.791014+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Ranran Xiao', 'General Counselor', 'xiaoranran0811@icloud.com', '+8617658130618', NULL, NULL,
    '2001-08-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20778259', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c59ff520-10d6-4367-bda2-cd16ae444c2e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Raul Suarez', 'Soccer Director', 'suarez18raul@gmail.com', '+34644787334', NULL, NULL,
    '2000-07-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18078886', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f27951af-3e11-440a-901e-f770f7af47a7'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Reagan Rahlf', 'Stitchery', 'reaganrahlf@gmail.com', '2088191074', NULL, NULL,
    '2005-04-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20612616', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c0ddde95-957c-444c-b29d-73b154eff2c7'::uuid, (SELECT target_company_id FROM v), '2026-04-26 03:04:04.673484+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Rebecca Fracassa', 'Pantry Chef/Assistant Chef', 'rebeccafracassa@gmail.com', '5863605593', NULL, NULL,
    '1993-07-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20852123', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ea44dd0b-29e7-4b19-9838-c5cca38fba7a'::uuid, (SELECT target_company_id FROM v), '2026-01-27 17:05:44.730761+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Reggie Jones', 'Grand Maître D''', 'scottg@camptlc.com', '8456882616', NULL, NULL,
    '1964-03-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2686006', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0c6678ac-140a-4a6d-a83d-9a61092f5962'::uuid, (SELECT target_company_id FROM v), '2026-01-27 04:05:24.7289+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Remi Sadoyan', 'Group Leader', 'Paige.sadoyan@gmail.com', '2012903588', NULL, NULL,
    '2003-11-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2490137', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c9e775bf-ce93-4961-9f4f-27f17f9241fa'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Rex O Sullivan', 'General Counselor', 'rexosullivan1@hotmail.com', '+353858000819', NULL, NULL,
    '2005-04-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19243992', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '491130cc-0106-4161-b893-e260ce066305'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Riad Arif', 'General Counselor', 'riadarif06@gmail.com', '+353833519983', NULL, NULL,
    '2003-06-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19454517', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'b9009340-6818-4146-bd6f-9189e2d9ab7b'::uuid, (SELECT target_company_id FROM v), '2026-04-17 03:04:07.311367+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ricardo Capistran Mendoza', 'Staff', 'ricardocapistranmendoza70@gmail.com', '+522282881917', NULL, NULL,
    '2004-12-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20521132', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e4d8db52-6703-447d-b2a5-98b294f1d3dd'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ricky Easterling II', 'Basketball Director', 'reasterlingii@gmail.com', '6672287311', NULL, NULL,
    '1983-11-08'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19571297', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '081a611b-1076-46be-98fe-dbd8023ffcb8'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Riley Valente', 'General Counselor', 'rileyvalente0@gmail.com', '13198595689', NULL, NULL,
    '2007-02-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20964875', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'afe0487e-eda1-469e-8790-c2e9daa1132c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Rio McLoughlin Barry', 'General Counselor', 'riomcloughlinbarry@gmail.com', '+353838386675', NULL, NULL,
    '2005-10-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19243991', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '5d7850e9-4f36-4612-ae3d-b65f7ec4d44e'::uuid, (SELECT target_company_id FROM v), '2026-04-16 04:04:03.85357+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Robyn Dorkin', 'General Counselor', 'robyndorkin83@gmail.com', '+27662077937', NULL, NULL,
    '2007-04-10'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20501009', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4c55d547-c20d-4dce-a779-e4a195634c66'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.726259+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Rory Burke', 'Program Assistant', 'roryburke03@gmail.com', '+353085814560', NULL, NULL,
    '2003-06-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20569101', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '7105f122-66a5-4942-b7bc-8afda494eac1'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Rory Lonergan', 'General Counselor', 'rorylo123@icloud.com', '07470098713', NULL, NULL,
    '2004-05-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20569647', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6f7be115-a349-48e0-848d-fcb523f43d85'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Ross Bradley', 'General Counselor', 'colette@sanserv.com', '+3530876160605', NULL, NULL,
    '2005-10-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20889153', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f8826122-f33a-4658-ab99-5553eb64cb0a'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Ross Parham', 'Boys Head Counselor', 'Rossparham4443@gmail.com', '9192659591', NULL, NULL,
    '1998-07-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '13627277', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '76812bc1-65f5-4dbb-bbc1-eb6fa11b3edd'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.25899+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Ruby McLoughlin', 'Lifeguard', 'rubygrace81102@icloud.com', '+642108800872', NULL, NULL,
    '2002-11-08'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19368029', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '05e252e9-8990-4712-b297-bc383ecf7f8f'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Ryan Kannepalli', 'Division Leader', 'ryankannepalli@yahoo.com', '+447881730074', NULL, NULL,
    '2000-11-27'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17440950', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ce654fa8-03c4-4729-a59a-3785a1aba930'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Sadie Sutcliffe', 'General Counselor', 'sadie.sutcliffe@outlook.com', '+4407742759389', NULL, NULL,
    '2004-11-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20521124', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '9146a4e0-ad38-4771-9eef-46a3b6064ddb'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Sam Bishop', 'Assistant Division Leader', 'sambishopmedia@gmail.com', '+447979795045', NULL, NULL,
    '1998-11-26'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17864248', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '0976fec9-2436-41c4-b91f-b1722660bb32'::uuid, (SELECT target_company_id FROM v), '2026-01-27 04:05:24.7289+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Sam Lipskin', 'Division Leader', 'slipskin@crimson.ua.edu', '5167784149', NULL, NULL,
    '2004-06-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2569816', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '32a2c324-b3b7-4a0f-bca1-ed0c0e131aa7'::uuid, (SELECT target_company_id FROM v), '2026-02-20 21:03:52.800911+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Sam Sherman', 'Junior Counselor', 'samsherman09@gmail.com', '2017496196', NULL, NULL,
    '2009-01-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '7058740', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'c04f751d-20ab-4652-84b8-9c8a4f821439'::uuid, (SELECT target_company_id FROM v), '2026-04-20 03:04:03.398354+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Sara Forero Calderon', 'Laundry/HK', 'saraforerocl@gmail.com', '+573144550539', NULL, NULL,
    '2006-09-29'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20515545', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'fe575f1b-2628-46d9-9c5d-0fcccaa08821'::uuid, (SELECT target_company_id FROM v), '2026-03-06 04:03:49.029861+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Scott Glick', 'Associate Director', 'scott@camptlc.com', '5168494002', NULL, NULL,
    '1989-04-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '5227948', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '39d36685-93ee-4a4d-b1b3-9816d1d03c58'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Sean Barry', 'Group Leader', 'Seanbarry132@gmail.com', '+3530873479843', NULL, NULL,
    '2003-07-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '17160107', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4b5c7377-15ca-4b2a-a4f5-29377d295a1a'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Seb Miell', 'Division Leader', 'seb.miell@hotmail.co.uk', '+447825811666', NULL, NULL,
    '1988-12-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18475813', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '72b90674-5bd8-4b99-96ec-b62d3631575c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Seth Williams', 'Division Leader', 'seth.williams@elbaps.org', '4027202997', NULL, NULL,
    '1995-03-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18683829', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '297ada8f-cbd6-447b-98d4-f6bd0a6bd981'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Seán Burke', 'General Counselor', 'seanwjb@gmail.com', '+353874329638', NULL, NULL,
    '2003-07-01'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18048411', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd637828f-4e74-4ce3-a9fd-0e10cff41053'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.791014+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Sienna Doyle', 'Nanny', 'sienna.doyle49@norland.ac.uk', '07758113841', NULL, NULL,
    '2004-03-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20773733', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'a9e0f14c-a678-4810-9d1a-0d787b237654'::uuid, (SELECT target_company_id FROM v), '2026-04-11 18:04:06.836128+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Siranush Chobanyan', 'Office', NULL, '5166922811', NULL, NULL,
    '1945-03-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '2686003', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'bd6f58ea-83c3-4593-a39c-340de2f1c96e'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.381782+00'::timestamptz, '2026-04-29 11:04:03.881902+00'::timestamptz,
    'Sophia Waterton', 'Staff', 'sophiawaterton@icloud.com', '+447824776066', NULL, NULL,
    '2006-12-20'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21378147', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '14c63b54-ba8c-42ee-9aec-b95d5394ab8f'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Sophie Ford', 'General Counselor', 'sophiemiaford@gmail.com', '07311595975', NULL, NULL,
    '2004-02-21'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21220929', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '2a78470f-d29a-416a-b10f-8dfb73737693'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Sophie Macleod', 'General Counselor', 'smacleod58@yahoo.co.uk', '07497831697', NULL, NULL,
    '2002-05-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21007052', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e3288b4e-cbc7-4a0e-ab3d-d8a94d57047c'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Sophie Stansfield', 'Assistant Division Leader', 'Sophiexanne2211@gmail.com', '07885801676', NULL, NULL,
    '2001-11-22'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18133535', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6e8b5979-f5c9-4c09-b319-7e1d8665fd34'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.495688+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Stella Drummond', 'General Counselor', 'stelladrummond03@icloud.com', '+447407078947', NULL, NULL,
    '2006-10-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20718463', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3414d444-8d77-4af1-be1c-04699d657517'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Tara Attari', 'General Counselor', 'tara.attari1@gmail.com', '+447935471970', NULL, NULL,
    '2006-01-07'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21242196', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '3fd99685-30fc-4630-8a89-2d74dbc84ef1'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Taylor Carbonel', 'Basketball Director', 'taylorcarbonel479@gmail.com', '4798561075', NULL, NULL,
    '1999-02-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '14225061', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '007e3f1c-e065-497b-ae22-40d30c5e1c8f'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Thomas Kierse', 'General Counselor', 'thomaskierse@icloud.com', '0428247774', NULL, NULL,
    '2008-04-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20935728', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6b531dbb-e1d9-4943-95df-8552ba2829bf'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Thomas McPhee', 'General Counselor', 'tommcphee12@gmail.com', '+61416800064', NULL, NULL,
    '2002-07-03'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21115632', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '5ea68ada-d2e3-40a9-87e9-c1bb4eca7ea5'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.437425+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Tim Cross', 'Head Culinary Instructor', 'rovcross@aol.com', '5186101861', NULL, NULL,
    '1964-10-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '9284974', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '4b337e7e-9597-4a9e-bd6b-488b621b8790'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Tim Wilhelm', 'General Counselor', 'timwilbvb@t-online.de', '+491756336913', NULL, NULL,
    '2002-08-14'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21090284', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'e1783cb3-ba09-4256-814f-dfeede0e2fea'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Toby Creasey', 'Musical Director', 'creasey.toby1@sky.com', '+447539476267', NULL, NULL,
    '2001-02-08'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19117549', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'd2f9d3c3-5113-4514-92ba-cfbd415a3974'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Tyron Dorkin', 'Lifeguard', 'dorkintyron@gmail.com', '0662024835', NULL, NULL,
    '2004-08-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18353012', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '875b9695-8c3c-4481-bf54-310c8c10e002'::uuid, (SELECT target_company_id FROM v), '2026-04-28 03:04:00.413298+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Veronika Szucsova', 'Laundry/HK', 'veronika.szucsova145@gmail.com', '+4210944270761', NULL, NULL,
    '2003-08-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20526756', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'cc3d67d1-6df0-4c0d-bdfe-146360700f0f'::uuid, (SELECT target_company_id FROM v), '2026-04-28 03:04:00.413298+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Victor Ferrer', 'Laundry/HK', 'ferrervictor00@gmail.com', '3326115969', NULL, NULL,
    '2006-09-02'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '19999044', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '35a87730-2ec6-4555-b197-531b533c20fe'::uuid, (SELECT target_company_id FROM v), '2026-04-27 03:04:06.053796+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Victoria Barrett', 'General Counselor', 'toriamichelle17@icloud.com', '2489935170', NULL, NULL,
    '2003-07-17'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20047035', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '6079e17f-b55e-489f-a4f3-f07f25484b59'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.320859+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Vladislav Aguirre Gutierrez', 'General Counselor', 'LASCLAVESDESOL@GMAIL.COM', NULL, NULL, NULL,
    '2005-10-24'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '21257979', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '081b066c-92b9-4d98-b24c-17af4a8ae89f'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'Vuldyn Naidoo', 'General Counselor', 'vuldyn10@gmail.com', '0670089721', NULL, NULL,
    '2004-04-23'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20595419', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '8bb4086b-1353-4ddd-9928-8b1b2c6a9d76'::uuid, (SELECT target_company_id FROM v), '2026-04-14 04:04:02.709043+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Víctor Melo Gutierrez', 'Potwasher', 'vimelo552@gmail.com', '+528333678782', NULL, NULL,
    '2006-02-05'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20669869', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '2b6d6cab-1dc3-4b98-a73a-ae304a2920b6'::uuid, (SELECT target_company_id FROM v), '2026-04-27 04:04:00.581514+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Waleed Cherif', 'Division Leader', 'waleedc98@gmail.com', '9726556314', NULL, NULL,
    '1998-01-31'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20892052', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'be2d033e-83b5-4921-b00e-e15c883fe98f'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.495688+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'William Reynolds', 'General Counselor', 'williamcharliereynolds@gmail.com', '+447979977283', NULL, NULL,
    '2007-06-04'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20718468', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'ebca7cb4-ee3d-464a-ac8f-4b96856037bc'::uuid, (SELECT target_company_id FROM v), '2026-04-24 04:04:11.667083+00'::timestamptz, '2026-04-29 11:04:03.732735+00'::timestamptz,
    'William Robertshawe', 'General Counselor', 'william.shaw129@gmail.com', '+64277157764', NULL, NULL,
    '2003-09-13'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20573325', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '168e26ab-6afe-4754-ac85-366087ed7378'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Yasmin Powell', 'General Counselor', 'yasminepowell03@gmail.com', '07549995840', NULL, NULL,
    '2003-09-28'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '16770344', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'cc27e679-eefa-4032-b400-b4644e521093'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.341207+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Zach Cohen', 'Junior Counselor', 'zacharycohen617@gmail.com', '5168531251', NULL, NULL,
    '2009-06-17'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '8409242', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '62cdb0cd-39e8-4d3d-b0f1-16befb229f50'::uuid, (SELECT target_company_id FROM v), '2026-04-18 04:04:07.495688+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Zachary Coles', 'General Counselor', 'zachary.coles@sky.com', '+447593554508', NULL, NULL,
    '2006-09-18'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20791655', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '62bddb6b-7845-44b8-8c42-a745a6ec95ef'::uuid, (SELECT target_company_id FROM v), '2026-04-26 03:04:04.673484+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'sholto coulter', 'Outdoor Adventure Instructor', 'sholto.coulter@proton.me', '+447904939592', NULL, NULL,
    '2007-05-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20719980', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    'f36194a4-f159-4006-a055-39938ae02318'::uuid, (SELECT target_company_id FROM v), '2026-04-23 04:04:05.791014+00'::timestamptz, '2026-04-29 11:04:03.808399+00'::timestamptz,
    'Álvaro Ruiz Casanova', 'Tennis Instructor', 'alvaro.ruizcasanova07@gmail.com', '+34652322968', NULL, NULL,
    '2007-10-06'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '20774329', NULL, NULL,
    NULL, '{}'::text[], NULL
  ),
(
    '02e5e8be-870d-472c-b25d-eb2bd88251b4'::uuid, (SELECT target_company_id FROM v), '2026-04-29 04:04:07.174885+00'::timestamptz, '2026-04-29 11:04:03.65052+00'::timestamptz,
    'Ángela Marianne Macedo Ramírez', 'Laundry/HK', 'mariannemacedo11@outlook.com', '+522961090995', NULL, NULL,
    '2003-09-11'::date, NULL, NULL, '2026',
    'active', NULL, NULL, NULL, NULL,
    '18122832', NULL, NULL,
    NULL, '{}'::text[], NULL
  )
ON CONFLICT (company_id, person_id, season) DO UPDATE SET
  updated_at = EXCLUDED.updated_at,
  created_at = COALESCE(EXCLUDED.created_at, public.staff.created_at),
  name = EXCLUDED.name, role = EXCLUDED.role, email = EXCLUDED.email, phone = EXCLUDED.phone,
  department = EXCLUDED.department, gender = EXCLUDED.gender,
  date_of_birth = EXCLUDED.date_of_birth, hire_date = EXCLUDED.hire_date,
  session = EXCLUDED.session, season = EXCLUDED.season, status = EXCLUDED.status,
  staff_type = EXCLUDED.staff_type, allergies = EXCLUDED.allergies, rfid = EXCLUDED.rfid,
  photo_url = EXCLUDED.photo_url, leader_id = EXCLUDED.leader_id, division_id = EXCLUDED.division_id,
  sort_order = EXCLUDED.sort_order, specialty_sports = EXCLUDED.specialty_sports, tshirt_size = EXCLUDED.tshirt_size;

COMMIT;
