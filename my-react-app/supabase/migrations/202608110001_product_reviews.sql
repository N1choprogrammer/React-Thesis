-- -- Store public customer reviews for each product.

-- create table if not exists public.product_reviews (
--   id uuid primary key default gen_random_uuid(),
--   product_id uuid not null references public.products(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete set null,
--   reviewer_name text not null default 'Customer',
--   rating integer not null check (rating between 1 and 5),
--   comment text not null default '' check (char_length(trim(comment)) <= 1000),
--   created_at timestamptz not null default now()
-- );

-- alter table public.product_reviews enable row level security;

-- create index if not exists product_reviews_product_created_idx
--   on public.product_reviews (product_id, created_at desc);

-- drop policy if exists "Anyone can view product reviews" on public.product_reviews;
-- create policy "Anyone can view product reviews"
-- on public.product_reviews
-- for select
-- to anon, authenticated
-- using (true);

-- drop policy if exists "Customers can create product reviews" on public.product_reviews;
-- create policy "Customers can create product reviews"
-- on public.product_reviews
-- for insert
-- to authenticated
-- with check (
--   auth.uid() = user_id
--   and rating between 1 and 5
--   and char_length(trim(comment)) <= 1000
--   and exists (
--     select 1
--     from public.orders
--     join public.order_items on order_items.order_id = orders.id
--     where orders.user_id = auth.uid()
--       and order_items.product_id = product_reviews.product_id
--   )
-- );
