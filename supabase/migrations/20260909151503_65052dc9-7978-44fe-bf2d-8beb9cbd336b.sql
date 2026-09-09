DROP TABLE IF EXISTS public.canva_oauth_state;
DROP TABLE IF EXISTS public.canva_connections;
ALTER TABLE public.generated_posts
  DROP COLUMN IF EXISTS canva_import_job_id,
  DROP COLUMN IF EXISTS canva_design_id,
  DROP COLUMN IF EXISTS canva_edit_url,
  DROP COLUMN IF EXISTS canva_view_url,
  DROP COLUMN IF EXISTS final_image_url,
  DROP COLUMN IF EXISTS final_image_path;
NOTIFY pgrst, 'reload schema';