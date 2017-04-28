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
values (
    $1::bigint, --id
    $2::bigint, --fk_user
    $3::text,  --purpose
    $4::text,  --ipaddr
    $5::bigint --timestamp of issuance
    $6::bigint --timestamp of revoked
    $7::text   --revoked reason
    $8::bigint --timestamp expiration
    $9::bigint --cooke template-id (if this token is not a cookie, set to 0)
);
