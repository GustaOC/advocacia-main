-- Migration: Add file attachment support to chat_messages
-- Run this in the Supabase SQL Editor

-- Add columns for file attachments
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create the storage bucket for chat files (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Storage policy: anyone can read chat files (public bucket)
CREATE POLICY "Public read access for chat files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

-- Storage policy: users can delete their own uploaded files
CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files');
