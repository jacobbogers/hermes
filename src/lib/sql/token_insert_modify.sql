WITH token_template AS (
    SELECT s2.id, s2.template_name, s2.max_age
    FROM auth.session_cookies_template AS s2
    WHERE s2.template_name = 'default_token' AND NOT EXISTS (
        SELECT 1
        FROM auth.session_cookies_template AS s3
        WHERE s3.template_name = $9::TEXT
    )

    UNION ALL

    SELECT s4.id, s4.template_name, s4.max_age
    FROM auth.session_cookies_template AS s4
    WHERE s4.template_name = $9::TEXT
),
anonymous_user AS (
     SELECT s.id, s.name
     FROM auth.user AS s
     WHERE s.name = 'anonymous'
)
INSERT INTO auth.issued_user_tokens (
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
    $1::TEXT,   --token-id
    CASE        -- fk_user_id
        WHEN $2::BIGINT IS NULL OR $2::BIGINT = s.id THEN s.id
        ELSE $2::BIGINT
    END,
    $3::TEXT,   --purpose
    $4::INET,   --ipaddr
    COALESCE($5::BIGINT, EXTRACT(EPOCH FROM current_timestamp) * 1000), --timestamp of issuance
    $6::BIGINT, --timestamp of revoked
    $7::BIGINT, --revoked reason
    COALESCE($8::BIGINT,
        COALESCE($5::BIGINT, EXTRACT(EPOCH FROM current_timestamp) * 1000) + s1.max_age
    ),          -- timestamp expire
    s1.id       -- template id
FROM
    anonymous_user AS s,
    token_template AS s1
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
RETURNING id, fk_user_id, purpose, ip_addr, timestamp_issued, timestamp_revoked, revoke_reason, timestamp_expire, fk_cookie_template_id;
