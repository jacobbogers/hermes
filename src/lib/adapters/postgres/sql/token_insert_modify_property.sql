INSERT INTO auth.session_props (fk_token_id, session_prop_name, session_prop_value, invisible)
    SELECT
        $1::TEXT AS fk_token_id,
        tokens.name,
        tokens.value,
        tokens.invisible
    FROM UNNEST($2::TEXT[], $3::TEXT[], $4::BOOLEAN[]) AS tokens(name, value, invisible)
ON CONFLICT (fk_token_id,session_prop_name) DO UPDATE
    SET session_prop_value = EXCLUDED.session_prop_value,
        invisible = EXCLUDED.invisible
RETURNING fk_token_id, session_prop_name, session_prop_value, invisible;
