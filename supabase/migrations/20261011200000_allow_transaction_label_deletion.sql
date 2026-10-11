-- Existing assignment foreign keys cascade when an owner deletes a label.
create policy "Users can delete their own transaction labels"
on public.transaction_labels for delete
to authenticated
using (user_id = auth.uid());
