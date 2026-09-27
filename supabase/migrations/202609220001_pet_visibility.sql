-- 펫은 관리자가 명시적으로 공개할 때만 활성화한다. 다른 기능의 기본값은 유지한다.
create or replace function public.debug_feature_enabled(p_feature text) returns boolean
  language sql security definer stable set search_path = public as $$
  select case (
      select value from public.app_settings where key = 'debug.' || p_feature
    )
    when '"public"'::jsonb then true
    when 'false'::jsonb then false
    when '"hidden"'::jsonb then false
    else case when p_feature = 'pet' and not exists (
      select 1 from public.app_settings where key = 'debug.pet'
    ) then false else public.is_debug_account() end
  end;
$$;
