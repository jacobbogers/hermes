DELETE FROM auth.issued_user_tokens -- on delete cascade on session_props
    WHERE revoke_reason IS NOT NULL
        AND timestamp_revoked <= $1::BIGINT;
