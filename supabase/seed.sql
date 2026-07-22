-- ═══════════════════════════════════════════════════════════════════
-- ESTANTE LIVRE — Seed data
-- Categorias iniciais e alguns livros de exemplo
-- ═══════════════════════════════════════════════════════════════════

-- Categorias
insert into public.categories (name, slug, description) values
  ('Ficção', 'ficcao', 'Romances, novelas e narrativas contemporâneas'),
  ('Filosofia', 'filosofia', 'Ensaios, tratados e obras filosóficas'),
  ('História', 'historia', 'Biografias e narrativas históricas'),
  ('Poesia', 'poesia', 'Coletâneas e obras poéticas'),
  ('Ciências', 'ciencias', 'Divulgação científica e ensaios'),
  ('Clássicos', 'classicos', 'Obras da tradição literária universal'),
  ('Ensaio', 'ensaio', 'Ensaios contemporâneos e crítica'),
  ('Infantojuvenil', 'infantojuvenil', 'Livros para jovens leitores')
on conflict (slug) do nothing;

-- Livros de exemplo
-- (Substitua as URLs de capas por imagens reais do seu Supabase Storage)
insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Grande Sertão: Veredas',
  'grande-sertao-veredas',
  'João Guimarães Rosa',
  'A saga de Riobaldo, jagunço do sertão mineiro, que narra suas aventuras, seus amores e o duelo com o Diabo pelo destino de sua alma. Uma das obras-primas da literatura brasileira, com uma linguagem que reinventa o português.',
  'Nova Fronteira',
  2019,
  624,
  (select id from public.categories where slug = 'classicos'),
  null,
  3, 3, true, 'GS-001'
where not exists (select 1 from public.books where slug = 'grande-sertao-veredas');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'O Idiota',
  'o-idiota',
  'Fiódor Dostoiévski',
  'O príncipe Míchkin volta à Rússia depois de anos em um sanatório suíço. Sua bondade extrema e sua ingenuidade o colocam em confronto com uma sociedade cínica.',
  'Editora 34',
  2011,
  680,
  (select id from public.categories where slug = 'classicos'),
  null,
  2, 2, true, 'ID-002'
where not exists (select 1 from public.books where slug = 'o-idiota');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Meditações',
  'meditacoes',
  'Marco Aurélio',
  'Anotações pessoais do imperador romano, escritas para si mesmo. Um dos textos fundamentais do estoicismo, reflexões sobre virtude, dever e a natureza humana.',
  'Companhia das Letras',
  2020,
  240,
  (select id from public.categories where slug = 'filosofia'),
  null,
  4, 4, true, 'MD-003'
where not exists (select 1 from public.books where slug = 'meditacoes');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'A Hora da Estrela',
  'a-hora-da-estrela',
  'Clarice Lispector',
  'A história de Macabéa, uma jovem nordestina que vive no Rio de Janeiro. O narrador Rodrigo S.M. constrói e questiona a existência de sua personagem.',
  'Rocco',
  2020,
  112,
  (select id from public.categories where slug = 'ficcao'),
  null,
  2, 2, false, 'HE-004'
where not exists (select 1 from public.books where slug = 'a-hora-da-estrela');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  '1984',
  '1984',
  'George Orwell',
  'Em uma Londres distópica, Winston Smith trabalha reescrevendo a história para o Partido. Sua rebelião silenciosa contra o Grande Irmão o leva a consequências que ele não pode prever.',
  'Companhia das Letras',
  2009,
  416,
  (select id from public.categories where slug = 'ficcao'),
  null,
  3, 2, true, 'NT-005'
where not exists (select 1 from public.books where slug = '1984');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Sapiens: Uma Breve História da Humanidade',
  'sapiens',
  'Yuval Noah Harari',
  'Um panorama da história do Homo sapiens, das savanas africanas à revolução tecnológica atual. Harari cruza biologia, antropologia e economia em uma narrativa provocativa.',
  'L&PM',
  2015,
  464,
  (select id from public.categories where slug = 'historia'),
  null,
  3, 3, false, 'SP-006'
where not exists (select 1 from public.books where slug = 'sapiens');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'Antologia Poética',
  'antologia-poetica-drummond',
  'Carlos Drummond de Andrade',
  'Seleção de poemas do autor mineiro, cobrindo décadas de produção. Do irônico ao lírico, do social ao íntimo.',
  'Companhia das Letras',
  2012,
  296,
  (select id from public.categories where slug = 'poesia'),
  null,
  2, 2, false, 'AP-007'
where not exists (select 1 from public.books where slug = 'antologia-poetica-drummond');

insert into public.books (
  title, slug, author, synopsis, publisher, year, pages,
  category_id, cover_url, total_copies, available_copies,
  featured, catalog_number
)
select
  'O Mundo Assombrado pelos Demônios',
  'o-mundo-assombrado',
  'Carl Sagan',
  'Um manifesto pelo pensamento cético e científico. Sagan defende a ciência como uma vela na escuridão do misticismo e da pseudociência.',
  'Companhia das Letras',
  2006,
  512,
  (select id from public.categories where slug = 'ciencias'),
  null,
  2, 2, false, 'MA-008'
where not exists (select 1 from public.books where slug = 'o-mundo-assombrado');

-- ═══════════════════════════════════════════════════════════════════
-- Como criar um admin
-- ═══════════════════════════════════════════════════════════════════
-- Depois de criar seu usuário pela interface, execute:
--
-- update public.profiles
-- set role = 'admin'
-- where email = 'seu-email@exemplo.com';
