delete from  auth.issued_user_tokens -- on delete cascade on  session_props
  where revoked_reason is not null 
 and expired <= $1:bigint

