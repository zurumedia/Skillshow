-- Skillshow Stage 2 database additions. Safe to run more than once. Nothing is removed or changed.
-- Run in Supabase > SQL Editor.

-- Work cards: a post can have a title and a skill tag
alter table posts add column if not exists title text;
alter table posts add column if not exists skill text;
alter table posts add column if not exists kind text default 'work';

-- Opportunities: a job post can be a job or a "looking for" request
alter table jobs add column if not exists kind text default 'job';

-- Let people edit their own posts (there was no rule for this before)
drop policy if exists "Edit own posts" on posts;
create policy "Edit own posts" on posts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
