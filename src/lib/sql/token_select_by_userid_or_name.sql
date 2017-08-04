WITH blacklisted_users AS (
    SELECT SS1.fk_user_id
    FROM auth.user_props AS SS1
    WHERE SS1.prop_name = 'blacklisted'
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
FROM
    auth.issued_user_tokens AS iut
    LEFT JOIN auth.user AS u ON (u.id = iut.fk_user_id)
    LEFT JOIN auth.session_props AS sp ON (iut.id = sp.fk_token_id and sp.invisible = FALSE)
    LEFT JOIN auth.user_props AS up ON (up.fk_user_id = u.id and up.invisible = FALSE)
    LEFT JOIN blacklisted_users AS bu ON (bu.fk_user_id = iut.fk_user_id)
    LEFT JOIN auth.session_cookies_template AS sct ON (sct.id = iut.fk_cookie_template_id)
WHERE
    iut.fk_user_id = COALESCE($1::BIGINT, iut.fk_user_id) AND COALESCE($2::TEXT, u.name) = u.name
    AND NOT ($1::BIGINT IS NOT NULL AND $2::BIGINT IS NOT NULL) -- can not both be non null
    AND NOT ($1::BIGINT IS NULL AND $2::BIGINT IS NULL); -- can not both be null
