# Delete account Edge Function

Deploy this function before releasing the client change:

```sh
supabase functions deploy delete-account
```

The function uses Supabase's built-in `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` secrets. Never expose the service-role key in the
mobile app.

All application tables that reference `auth.users(id)` must use `ON DELETE
CASCADE` (including profiles, memberships, connections, direct messages, event
attendees, and authored content). The function intentionally fails without
clearing the local session if a database constraint prevents complete deletion.
