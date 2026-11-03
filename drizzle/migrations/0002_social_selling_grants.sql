do $$
declare t text;
begin
  foreach t in array array[
    'ss_channels','ss_contacts','ss_tags','ss_contact_tags','ss_custom_fields','ss_variables',
    'ss_folders','ss_workflows','ss_templates','ss_reply_lists','ss_runs','ss_events',
    'ss_inbox_columns','ss_conversations','ss_messages','ss_shortcuts','ss_ice_breakers',
    'ss_links','ss_link_clicks','ss_settings'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

grant all on public.ss_channel_secrets to service_role;

NOTIFY pgrst, 'reload schema';