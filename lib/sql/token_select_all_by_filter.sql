with blacklisted_users as (
    Select id as fk_user from auth.user SS0 where id in 
      (select SS1.fk_user from auth.user_props SS1 where 
        SS1.prop_name = 'BLACKLISTED')
)
SELECT 
 iut.id token_id,
 iut.fk_user user_id,
 u.name usr_name,
 u.email usr_email,
 bu.fk_user black_listed,
 purpose,
 ip_addr,
 timestamp_issued,
 timestamp_expire,
 timestamp_revoked,
 revoke_reason,
 sct.template_name,
 session_prop_name,
 session_prop_value
from
   auth.issued_user_tokens iut
   left join auth.user u on (u.id = iut.fk_user)
   left join auth.session_props sp on (iut.id = sp.fk_token_id)
   left join blacklisted_users bu on (bu.fk_user = iut.fk_user)
   left join auth.session_cookies_template sct on (sct.id = iut.fk_cookie_template_id)
WHERE
  -- the timestamp is provided to have a potential "cutoff" point, very old expired might not be interesting to you.
  timestamp_expire > COALESCE($1::bigint, 0)
  and COALESCE(timestamp_revoked, 0) BETWEEN $2::bigint and $3::bigint  
