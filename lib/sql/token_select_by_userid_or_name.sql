SELECT 
 iut.id token_id,
 iut.fk_user user_id,
 u.name usr_name,
 u.email usr_email,
 up.fk_user black_listed,
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
   left join auth.session_props  sp on (iut.id = sp.fk_token_id)
   left join auth.user u on (u.id = iut.fk_user)
   left join auth.user_props up on (up.fk_user = u.id and up.prop_name = 'BLACKLISTED' )  
   left join auth.session_cookies_template sct on (sct.id = iut.fk_cookie_template_id)
WHERE
    iut.fk_user = COALESCE($1::bigint, iut.fk_user) AND COALESCE($2::text, u.name) = u.nameGU