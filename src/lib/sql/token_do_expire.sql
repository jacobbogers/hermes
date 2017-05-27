update auth.issued_user_tokens
  set timestamp_revoked = COALESCE($3::bigint,  extract( epoch from now()) * 1000 ),
      revoke_reason = $2::text
where id = $1::text
 RETURNING id