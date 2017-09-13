SELECT
    u.id usr_id,
    u.name user_name,
    u.email user_email,
    up.prop_name,
    up.prop_value
FROM
    auth.user AS u
    LEFT JOIN auth.user_props AS up ON (u.id = up.fk_user_id AND up.invisible = FALSE);
