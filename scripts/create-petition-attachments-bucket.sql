insert into storage.buckets (id, name, public, file_size_limit)
values ('petition-attachments', 'petition-attachments', false, 26214400)
on conflict (id) do update
set public = false,
    file_size_limit = 26214400;
