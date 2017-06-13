with all_reset_tokens as (
   select * from auth.issed_user_tokens where fk_user_id = $2::bigint and purpose = 5::text and timestamp_revokend is null
   union all
   select 
      $1::text, -- token id
      $2::bigint,  --user id
      $5::text, --purpose
      $3::inet, -- ip@port of the user agent when this token was issued
      COALESCE($4::bigint, extract( epoch from current_timestamp) * 1000 ),   --time of issuance
      null,  -- if revoked, this is when!...     
      null, -- if revoked, this is why! (MNEMONIC)
      COALESCE($4::bigint, extract( epoch from current_timestamp) * 1000 ), -- timestamp when this token expires
      0
)
 INSERT INTO auth.issued_user_tokens  
  select * from all_reset_tokens
ON CONFLICT (id) DO UPDATE 
  SET revoke_reason = 'RE' ,
      timestamp_revoked = COALESCE($4::bigint, extract( epoch from current_timestamp) * 1000 )
RETURNING 
    id,  
    fk_user_id, 
    purpose, 
    ip_addr, 
    timestamp_issued,
    timestamp_revoked,
    revoke_reason,
    timestamp_expire,
    fk_cookie_template_id

--    1 token id, 2 fk_user_id, 3 ip, 4 issuance/rovoke timestamp, 5 purpose