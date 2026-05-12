alter table scans enable row level security;
alter table breach_records enable row level security;
alter table broker_listings enable row level security;
alter table honey_tokens enable row level security;
alter table honey_token_hits enable row level security;
alter table dsar_requests enable row level security;
alter table compliance_results enable row level security;

drop policy if exists scans_owner_select on scans;
drop policy if exists scans_owner_insert on scans;
drop policy if exists scans_owner_update on scans;
drop policy if exists scans_owner_delete on scans;
create policy scans_owner_select on scans for select
  using (user_id = auth.uid()::text);
create policy scans_owner_insert on scans for insert
  with check (user_id = auth.uid()::text);
create policy scans_owner_update on scans for update
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
create policy scans_owner_delete on scans for delete
  using (user_id = auth.uid()::text);

drop policy if exists breach_records_owner_all on breach_records;
create policy breach_records_owner_all on breach_records for all
  using (exists (
    select 1 from scans
    where scans.id = breach_records.scan_id
      and scans.user_id = auth.uid()::text
  ))
  with check (exists (
    select 1 from scans
    where scans.id = breach_records.scan_id
      and scans.user_id = auth.uid()::text
  ));

drop policy if exists broker_listings_owner_all on broker_listings;
create policy broker_listings_owner_all on broker_listings for all
  using (exists (
    select 1 from scans
    where scans.id = broker_listings.scan_id
      and scans.user_id = auth.uid()::text
  ))
  with check (exists (
    select 1 from scans
    where scans.id = broker_listings.scan_id
      and scans.user_id = auth.uid()::text
  ));

drop policy if exists honey_tokens_owner_all on honey_tokens;
create policy honey_tokens_owner_all on honey_tokens for all
  using (exists (
    select 1 from scans
    where scans.id = honey_tokens.scan_id
      and scans.user_id = auth.uid()::text
  ))
  with check (exists (
    select 1 from scans
    where scans.id = honey_tokens.scan_id
      and scans.user_id = auth.uid()::text
  ));

drop policy if exists honey_token_hits_owner_all on honey_token_hits;
create policy honey_token_hits_owner_all on honey_token_hits for all
  using (exists (
    select 1
    from honey_tokens
    join scans on scans.id = honey_tokens.scan_id
    where honey_tokens.id = honey_token_hits.token_id
      and scans.user_id = auth.uid()::text
  ))
  with check (exists (
    select 1
    from honey_tokens
    join scans on scans.id = honey_tokens.scan_id
    where honey_tokens.id = honey_token_hits.token_id
      and scans.user_id = auth.uid()::text
  ));

drop policy if exists dsar_requests_owner_all on dsar_requests;
create policy dsar_requests_owner_all on dsar_requests for all
  using (exists (
    select 1 from scans
    where scans.id = dsar_requests.scan_id
      and scans.user_id = auth.uid()::text
  ))
  with check (exists (
    select 1 from scans
    where scans.id = dsar_requests.scan_id
      and scans.user_id = auth.uid()::text
  ));

drop policy if exists compliance_results_owner_all on compliance_results;
create policy compliance_results_owner_all on compliance_results for all
  using (exists (
    select 1 from scans
    where scans.id = compliance_results.scan_id
      and scans.user_id = auth.uid()::text
  ))
  with check (exists (
    select 1 from scans
    where scans.id = compliance_results.scan_id
      and scans.user_id = auth.uid()::text
  ));
