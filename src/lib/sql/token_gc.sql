delete from  auth.issued_user_tokens  -- on delete cascade on  session_props
  where revoke_reason is not null 
 and timestamp_revoked <= $1::bigint 
