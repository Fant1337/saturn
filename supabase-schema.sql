create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('user', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('Обрабатывается', 'Подтвержден', 'Отправлен', 'Доставлен', 'Отменен');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  full_name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  description text not null,
  specifications jsonb not null default '{}'::jsonb,
  stock integer not null default 0 check (stock >= 0),
  sku text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, image_url)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address text not null,
  status public.order_status not null default 'Обрабатывается',
  total_price numeric(12, 2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null check (quantity > 0),
  price numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists product_images_product_id_idx on public.product_images(product_id);
create index if not exists cart_items_user_id_idx on public.cart_items(user_id);
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, full_name, role)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  on conflict (id) do update
    set full_name = nullif(excluded.full_name, '');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.cart_items enable row level security;
alter table public.favorites enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users read own profile or admin" on public.users;
create policy "Users read own profile or admin"
on public.users for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own profile" on public.users;
create policy "Users insert own profile"
on public.users for insert
with check (id = auth.uid());

drop policy if exists "Users update own profile or admin" on public.users;
create policy "Users update own profile or admin"
on public.users for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
on public.categories for select
using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public read products" on public.products;
create policy "Public read products"
on public.products for select
using (true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public read product images" on public.product_images;
create policy "Public read product images"
on public.product_images for select
using (true);

drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images"
on public.product_images for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users manage own cart" on public.cart_items;
create policy "Users manage own cart"
on public.cart_items for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites"
on public.favorites for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users read own orders or admin" on public.orders;
create policy "Users read own orders or admin"
on public.orders for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users create own orders" on public.orders;
create policy "Users create own orders"
on public.orders for insert
with check (user_id = auth.uid());

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
on public.orders for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users read own order items or admin" on public.order_items;
create policy "Users read own order items or admin"
on public.order_items for select
using (
  public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users create own order items" on public.order_items;
create policy "Users create own order items"
on public.order_items for insert
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items"
on public.order_items for all
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Product images public read" on storage.objects;
create policy "Product images public read"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins manage product storage" on storage.objects;
create policy "Admins manage product storage"
on storage.objects for all
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

insert into public.categories (id, name, slug, image_url)
values
  ('11111111-1111-4111-8111-111111111111', 'Низкие частоты', 'low-frequency', 'assets/images/category-comms.png'),
  ('22222222-2222-4222-8222-222222222222', 'Средние частоты', 'mid-frequency', 'assets/images/category-optics.png'),
  ('33333333-3333-4333-8333-333333333333', 'Высокие частоты', 'high-frequency', 'assets/images/category-storage.png')
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    image_url = excluded.image_url;

insert into public.products (id, name, price, description, specifications, stock, sku, category_id, image_url, created_at)
values
  (
    'aaaaaaaa-0001-4000-9000-000000000001',
    'Антенна спиральная 300-440 L\R',
    15800,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 300–440 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"7 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"300-440 МГц","Полоса пропускания":"140 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-001',
    '11111111-1111-4111-8111-111111111111',
    '',
    '2026-06-01 10:00:00+00'
  ),
  (
    'aaaaaaaa-0002-4000-9000-000000000002',
    'Антенна спиральная 440-650 L\R',
    18200,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 440–650 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"8 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"440-650 МГц","Полоса пропускания":"210 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-002',
    '11111111-1111-4111-8111-111111111111',
    '',
    '2026-06-02 10:00:00+00'
  ),
  (
    'aaaaaaaa-0003-4000-9000-000000000003',
    'Антенна спиральная 650-850 L\R',
    22500,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 650–850 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"8 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"650-850 МГц","Полоса пропускания":"200 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-003',
    '11111111-1111-4111-8111-111111111111',
    '',
    '2026-06-03 10:00:00+00'
  ),
  (
    'aaaaaaaa-0004-4000-9000-000000000004',
    'Антенна спиральная 850-1100 L\R',
    26800,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 850–1100 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"9 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"850-1100 МГц","Полоса пропускания":"250 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-004',
    '22222222-2222-4222-8222-222222222222',
    '',
    '2026-06-04 10:00:00+00'
  ),
  (
    'aaaaaaaa-0005-4000-9000-000000000005',
    'Антенна спиральная 1100-1450 L\R',
    31200,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 1100–1450 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"10 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"1100-1450 МГц","Полоса пропускания":"350 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-005',
    '22222222-2222-4222-8222-222222222222',
    '',
    '2026-06-05 10:00:00+00'
  ),
  (
    'aaaaaaaa-0006-4000-9000-000000000006',
    'Антенна спиральная 1450-1750 L\R',
    32800,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 1450–1750 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"10 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"1450-1750 МГц","Полоса пропускания":"300 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-006',
    '22222222-2222-4222-8222-222222222222',
    '',
    '2026-06-06 10:00:00+00'
  ),
  (
    'aaaaaaaa-0007-4000-9000-000000000007',
    'Антенна спиральная 1750-2150 L\R',
    34500,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 1750–2150 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"11 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"1750-2150 МГц","Полоса пропускания":"400 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-007',
    '33333333-3333-4333-8333-333333333333',
    '',
    '2026-06-07 10:00:00+00'
  ),
  (
    'aaaaaaaa-0008-4000-9000-000000000008',
    'Антенна спиральная 2150-2450 L\R',
    36200,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 2150–2450 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"11 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"2150-2450 МГц","Полоса пропускания":"300 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-008',
    '33333333-3333-4333-8333-333333333333',
    '',
    '2026-06-08 10:00:00+00'
  ),
  (
    'aaaaaaaa-0009-4000-9000-000000000009',
    'Антенна спиральная 2450-2750 L\R',
    38000,
    'Широкополосная спиральная антенна с круговой поляризацией для пеленгования и мониторинга в диапазоне 2450–2750 МГц. Корпус из алюминиевого сплава АМг6, защитное покрытие — эмаль МЛ-12.',
    '{"КУ":"12 дБ","КСВ":"не более 1,5","Поляризация":"круговая L/R","Входное сопротивление":"50 Ом","Разъём":"N-female","Диапазон частот":"2450-2750 МГц","Полоса пропускания":"300 МГц","Максимальная мощность":"не более 100 Вт","Материал корпуса":"алюминиевый сплав АМг6","Покрытие":"эмаль МЛ-12"}',
    25,
    'ANT-009',
    '33333333-3333-4333-8333-333333333333',
    '',
    '2026-06-09 10:00:00+00'
  )
on conflict (id) do update
set name = excluded.name,
    price = excluded.price,
    description = excluded.description,
    specifications = excluded.specifications,
    stock = excluded.stock,
    sku = excluded.sku,
    category_id = excluded.category_id,
    image_url = excluded.image_url;

insert into public.product_images (product_id, image_url, alt_text, sort_order)
values
  ('aaaaaaaa-0001-4000-9000-000000000001', '', 'Антенна спиральная 300-440 L\R ANT-001', 0),
  ('aaaaaaaa-0002-4000-9000-000000000002', '', 'Антенна спиральная 440-650 L\R ANT-002', 0),
  ('aaaaaaaa-0003-4000-9000-000000000003', '', 'Антенна спиральная 650-850 L\R ANT-003', 0),
  ('aaaaaaaa-0004-4000-9000-000000000004', '', 'Антенна спиральная 850-1100 L\R ANT-004', 0),
  ('aaaaaaaa-0005-4000-9000-000000000005', '', 'Антенна спиральная 1100-1450 L\R ANT-005', 0),
  ('aaaaaaaa-0006-4000-9000-000000000006', '', 'Антенна спиральная 1450-1750 L\R ANT-006', 0),
  ('aaaaaaaa-0007-4000-9000-000000000007', '', 'Антенна спиральная 1750-2150 L\R ANT-007', 0),
  ('aaaaaaaa-0008-4000-9000-000000000008', '', 'Антенна спиральная 2150-2450 L\R ANT-008', 0),
  ('aaaaaaaa-0009-4000-9000-000000000009', '', 'Антенна спиральная 2450-2750 L\R ANT-009', 0)
on conflict do nothing;

-- После регистрации первого администратора выполните:
-- update public.users set role = 'admin' where phone = '+79990000000';
