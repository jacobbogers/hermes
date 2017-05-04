with token_template as (
     select s2.id,  s2.template_name, s2.max_age   from auth.session_cookies_template s2 where s2.template_name = 'default_token'
       and not exists (select 1 from auth.session_cookies_template s3 where s3.template_name = $7::text)
     UNION ALL
      select s4.id, s4.template_name, s4.max_age  from auth.session_cookies_template s4 where s4.template_name = $7::text  
),
anonymous_user as (
     SELECT s.id, s.name from auth.user s where s.name = 'anonymous'
)
insert into auth.issued_user_tokens ( 
    id , 
    fk_user, 
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
    CASE 
       WHEN $2::bigint IS NULL THEN  s.id
       WHEN $2::bigint IS NOT NULL AND $2::bigint <> s.id THEN $2::bigint
       ELSE -99999 -- force and insert error
    END,   
    $3::text,  --purpose
    $4::inet,  --ipaddr
    COALESCE($5::bigint, extract( epoch from now()) * 1000 ),--timestamp of issuance
    NULL, --timestamp of revoked
    NULL, --revoked reason
   COALESCE( $6::bigint, 
       COALESCE( $5::bigint, extract( epoch from now()) * 1000) + s1.max_age 
     ),
    s1.id
 from 
   anonymous_user s,
   token_template s1 
 RETURNING  id as uid, fk_user,timestamp_issued, timestamp_expire,fk_cookie_template_id