with blacklisted_users as (
    Select SS0.id as fk_user from auth.user SS0 where SS0.id in 
      (select SS1.fk_user from auth.user_props SS1 where 
        SS1.name = 'BLACKLISTED')
)
SELECT 
 S0.id token_id,
 S0.fk_user user_id,
 S3.name usr_name,
 S3.email usr_email,
 s2.fk_user black_listed,
 purpose,
 ip_addr,
 timestamp_issued ts_issuance,
 timestamp_revoked ts_revoked,
 revoke_reason,
 timestamp_expire,
 fk_cookie_template_id cookie_template
 session_prop_name,
 session_prop_value
from
   auth.issued_user_tokens S0,
   left join auth.user S3 on (S3.id = S0.fk_user)
   left join auth.session_props S1 on (S0.id = S1.fk_token_id)
   left join blacklisted_users s2 on (S2.fk_user = s0.fk_user)
WHERE
  -- s1.revoke_reason is null, i put this here for documentation reasons,, never!!! do this
  --   because nulls are not put index (in oracle/postgresql).
  --  
  timestamp_expire <= $1::bigint  

   
