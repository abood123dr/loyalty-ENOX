alter table if exists public.stores
drop column if exists passkit_program_id,
drop column if exists passkit_tier_id,
drop column if exists passkit_stamp_tier_ids,
drop column if exists passkit_template_id,
drop column if exists passkit_enabled;

drop table if exists public.passkit_integrations;
