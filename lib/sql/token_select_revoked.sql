SELECT
 S0.id token_id,
 S0.fk_user user_id,
 S2.name usr_name,
 S2.email usr_email,
 S3.fk_user black_listed,
 purpose,
 ip_addr,
 timestamp_issued ts_issuance,
 timestamp_revoked ts_revoked,
 revoke_reason,
 timestamp_expire,
 fk_cookie_template_id cookie_template
 session_prop_name as prop_name,
 session_prop_value as prop_value
from
   auth.issued_user_tokens S0
   left join auth.user S2 on (S2.id = S0.fk_user)
   left join auth.session_props S1 on (S1.fk_token_id = S0.id)
   left join auth.user_props S3 on (S3.fk_user = S2.id and S3.name = 'BLACKLISTED')
WHERE
  -- s1.revoke_reason is null, i put this here for documentation reasons,, never!!! do this
  --   because nulls are not put index (in oracle/postgresql).
  --  
  timestamp_expire <= $1::bigint  
  and revoked_reason is not null

   