GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.years TO authenticated;
GRANT ALL ON public.years TO service_role;

GRANT SELECT ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;

GRANT SELECT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;

GRANT SELECT ON public.abbreviations TO authenticated;
GRANT ALL ON public.abbreviations TO service_role;

GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;

GRANT SELECT ON public.choices TO authenticated;
GRANT ALL ON public.choices TO service_role;

GRANT SELECT, INSERT ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;

GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;

GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;