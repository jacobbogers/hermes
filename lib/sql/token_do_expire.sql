update auth.issued_user_tokens
  set timestamp_revoked = $1::bigint,
      revoke_reason = $2::text
where id = $3::bigint
