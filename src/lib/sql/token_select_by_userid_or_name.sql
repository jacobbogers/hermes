with blacklisted_users as (
    select SS1.fk_user_id from auth.user_props SS1 where 
        SS1.prop_name = 'blacklisted')
)
SELECT 
 iut.id token_id,
 iut.fk_user_id user_id,
 u.name usr_name,
 u.email usr_email,
 bu.fk_user_id black_listed,
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
   left join auth.user u on (u.id = iut.fk_user_id)
   left join auth.session_props sp on (iut.id = sp.fk_token_id and sp.invisible = false )
   left join auth.user_props up on (up.fk_user_id = u.id and up.invisible = false)
   left join blacklisted_users bu on (bu.fk_user_id = iut.fk_user_id)
   left join auth.session_cookies_template sct on (sct.id = iut.fk_cookie_template_id)
WHERE
    iut.fk_user_id = COALESCE($1::bigint, iut.fk_user_id) AND COALESCE($2::text, u.name) = u.name
    and not ($1::bigint is not null and $2::bigint is not null) #can not both be non null
    and not ($1::bigint is null and $2::bigint is null); # can not both be null