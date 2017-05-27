with token_template as (
     select s2.id,  s2.template_name, s2.max_age   from auth.session_cookies_template s2 where s2.template_name = 'default_token'
       and not exists (select 1 from auth.session_cookies_template s3 where s3.template_name = $9::text)
     UNION ALL
      select s4.id, s4.template_name, s4.max_age  from auth.session_cookies_template s4 where s4.template_name = $9::text  
),
anonymous_user as (
     SELECT s.id, s.name from auth.user s where s.name = 'anonymous'
)
insert into auth.issued_user_tokens ( 
    id, 
    fk_user_id, 
    purpose, 
    ip_addr, 
    timestamp_issued,
    timestamp_revoked,
    revoke_reason,
    timestamp_expire,
    fk_cookie_template_id
    )     
SELECT
    $1::text, --token-id
    CASE -- fk_user_id
       WHEN $2::bigint IS NULL OR $2::bigint = s.id THEN  s.id
       ELSE $2::bigint
    END,   
    $3::text,  --purpose
    $4::inet,  --ipaddr
    COALESCE($5::bigint, extract( epoch from current_timestamp) * 1000 ),--timestamp of issuance
    $6::bigint, --timestamp of revoked
    $7::bigint, --revoked reason
   COALESCE( $8::bigint, 
       COALESCE( $5::bigint, extract( epoch from current_timestamp) * 1000) + s1.max_age 
     ), -- timestamp expire
    s1.id -- template id
 from 
   anonymous_user s,
   token_template s1 
 ON CONFLICT (id) DO UPDATE
   SET 
    fk_user_id =EXCLUDED.fk_user_id,
    purpose = EXCLUDED.purpose,
    ip_addr = EXCLUDED.ip_addr,
    timestamp_issued = EXCLUDED.timestamp_issued,
    timestamp_revoked = EXCLUDED.timestamp_revoked,
    revoke_reason = EXCLUDED.revoke_reason,
    timestamp_expire = EXCLUDED.timestamp_expire,
    fk_cookie_template_id = EXCLUDED.fk_cookie_template_id
 RETURNING  id, fk_user_id, purpose, ip_addr, timestamp_issued, timestamp_revoked, revoke_reason, timestamp_expire, fk_cookie_template_id