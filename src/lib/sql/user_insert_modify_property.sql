INSERT INTO auth.user_props(fk_user_id, prop_name, prop_value, invisible)
    SELECT
        $1::BIGINT AS fk_user_id,
        up.name,
        up.value,
        up.invisible
    FROM UNNEST($2::TEXT[], $3::TEXT[], $4::BOOLEAN[]) AS up(name, value, invisible)
ON CONFLICT (fk_user_id, prop_name) DO UPDATE
    SET prop_value = EXCLUDED.prop_value,
        invisible = EXCLUDED.invisible
RETURNING fk_user_id, prop_name, prop_value, invisible;
