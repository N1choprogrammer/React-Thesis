create or replace function public.reserve_stock_for_order(items jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  requested_quantity integer;
  updated_rows integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to reserve stock.' using errcode = '42501';
  end if;

  for item in select value from jsonb_array_elements(items)
  loop
    requested_quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));

    if nullif(item->>'variant_id', '') is not null then
      update public.product_color_stock
      set stock = stock - requested_quantity
      where id = (item->>'variant_id')::uuid
        and stock >= requested_quantity;
    elsif nullif(item->>'color', '') is not null then
      update public.product_color_stock
      set stock = stock - requested_quantity
      where product_id = (item->>'product_id')::uuid
        and lower(trim(color)) = lower(trim(item->>'color'))
        and stock >= requested_quantity;
    else
      update public.products
      set stock = stock - requested_quantity
      where id = (item->>'product_id')::uuid
        and stock >= requested_quantity;
    end if;

    get diagnostics updated_rows = row_count;
    if updated_rows <> 1 then
      raise exception 'One or more products are no longer available in the requested quantity.' using errcode = 'P0001';
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.reserve_stock_for_order(jsonb) from public;
grant execute on function public.reserve_stock_for_order(jsonb) to authenticated;

create or replace function public.release_stock_reservation(items jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  requested_quantity integer;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to release stock.' using errcode = '42501';
  end if;

  for item in select value from jsonb_array_elements(items)
  loop
    requested_quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));

    if nullif(item->>'variant_id', '') is not null then
      update public.product_color_stock
      set stock = stock + requested_quantity
      where id = (item->>'variant_id')::uuid;
    elsif nullif(item->>'color', '') is not null then
      update public.product_color_stock
      set stock = stock + requested_quantity
      where product_id = (item->>'product_id')::uuid
        and lower(trim(color)) = lower(trim(item->>'color'));
    else
      update public.products
      set stock = stock + requested_quantity
      where id = (item->>'product_id')::uuid;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.release_stock_reservation(jsonb) from public;
grant execute on function public.release_stock_reservation(jsonb) to authenticated;

drop policy if exists "Customers can cancel their pending orders" on public.orders;
create policy "Customers can cancel their pending orders"
on public.orders
for update
to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status = 'cancelled');