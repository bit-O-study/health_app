alter table public.support_tickets
  drop constraint support_tickets_status_check,
  add constraint support_tickets_status_check check (
    status in ('new', 'acknowledged', 'development_review', 'development_done',
               'in_progress', 'waiting_user', 'resolved', 'closed')
  );
