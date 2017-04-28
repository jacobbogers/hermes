insert into auth.session_props (
    fk_token_id,
    session_prop_name,
    session_prop_value
)
values (
    $1::bigint,
    $2::text,
    $3::text
)
