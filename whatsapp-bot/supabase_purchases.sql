-- Create Purchases Table
create table if not exists public.purchases (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now(),
    item text not null,
    client text not null, -- Company Name (Masternet, Suprinet, etc)
    requester text, -- Who asked (WhatsApp number or Name)
    status text default 'pending', -- pending, waiting, completed
    quantity integer,
    amount numeric, -- Total cost
    receipt_url text, -- URL to storage
    user_id uuid references auth.users(id) -- Optional: Link to Auth User if needed
);

-- Enable RLS
alter table public.purchases enable row level security;

-- Policies (Adjust according to your needs, allowing public for Bot for now or specific user)
create policy "Enable all access for authenticated users" on public.purchases
    for all using (true) with check (true);
    
-- (Optional) If Bot uses Service Key, RLS is bypassed. If using User Auth, ensure policy matches.

-- Create Storage Bucket for Receipts
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Public Access" on storage.objects
  for select using ( bucket_id = 'receipts' );

create policy "Authenticated Upload" on storage.objects
  for insert with check ( bucket_id = 'receipts' );
