begin;

set local lock_timeout = '5s';

alter table public.jobs
  add column scheduled_time time(0) check (scheduled_time < time '24:00'),
  add column schedule_order integer check (schedule_order > 0),
  add constraint jobs_schedule_requires_date check (
    scheduled_date is not null or (scheduled_time is null and schedule_order is null)
  );

create function public.save_job_schedule_order(
  p_day date,
  p_job_ids uuid[],
  p_use_time_order boolean default false
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  day_start timestamptz := p_day::timestamp at time zone 'Pacific/Auckland';
  day_end timestamptz := (p_day + 1)::timestamp at time zone 'Pacific/Auckland';
  day_job_ids uuid[];
begin
  select array(select id from public.jobs
    where scheduled_date >= day_start and scheduled_date < day_end
    order by id for update)
  into day_job_ids;

  if p_day is null or p_job_ids is null or cardinality(p_job_ids) <> cardinality(day_job_ids)
     or not (day_job_ids <@ p_job_ids) then
    raise exception 'The jobs for this day have changed. Refresh the schedule and try again.';
  end if;

  update public.jobs as job
     set schedule_order = case when p_use_time_order then null else ordered.position::integer end
    from unnest(p_job_ids) with ordinality as ordered(id, position)
   where job.id = ordered.id;
end;
$$;

revoke all on function public.save_job_schedule_order(date, uuid[], boolean) from public, anon;
grant execute on function public.save_job_schedule_order(date, uuid[], boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
