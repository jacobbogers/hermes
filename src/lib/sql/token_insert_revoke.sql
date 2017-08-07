WITH all_reset_tokens AS (
    SELECT *
    FROM auth.issed_user_tokens
    WHERE fk_user_id = $2::BIGINT AND purpose = 5::TEXT AND timestamp_revokend IS NULL

    UNION ALL

    SELECT
        $1::TEXT,   -- token id
        $2::BIGINT, --user id
        $5::TEXT,   --purpose
        $3::INET,   -- ip@port of the user agent when this token was issued
        COALESCE($4::BIGINT, EXTRACT(EPOCH FROM current_timestamp) * 1000),   --time of issuance
        NULL,       -- if revoked, this is when!...
        NULL,       -- if revoked, this is why! (MNEMONIC)
        COALESCE($4::BIGINT, EXTRACT(EPOCH FROM current_timestamp) * 1000),   -- timestamp when this token expires
        0
)
INSERT INTO auth.issued_user_tokens
    SELECT * FROM all_reset_tokens
ON CONFLICT (id) DO UPDATE
    SET revoke_reason = 'RE',
        timestamp_revoked = COALESCE($4::BIGINT, EXTRACT(EPOCH FROM current_timestamp) * 1000)
RETURNING
    id,
    fk_user_id,
    purpose,
    ip_addr,
    timestamp_issued,
    timestamp_revoked,
    revoke_reason,
    timestamp_expire,
    fk_cookie_template_id;

-- 1 token id, 2 fk_user_id, 3 ip, 4 issuance/rovoke timestamp, 5 purpose
