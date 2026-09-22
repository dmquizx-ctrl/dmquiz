CREATE POLICY "question_images_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'question-images');
CREATE POLICY "question_images_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'question-images');
CREATE POLICY "question_images_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'question-images') WITH CHECK (bucket_id = 'question-images');
CREATE POLICY "question_images_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'question-images');