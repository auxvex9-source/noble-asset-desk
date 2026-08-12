DROP POLICY IF EXISTS "Users manage own avatar" ON storage.objects;
CREATE POLICY "Users manage own avatar"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role)))
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);