
CREATE POLICY "issue photos read" ON storage.objects FOR SELECT USING (bucket_id = 'issue-photos');
CREATE POLICY "issue photos insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'issue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "issue photos delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'issue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
