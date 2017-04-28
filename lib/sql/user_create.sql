insert into auth.user (
    id,
    name,
    email
)
values (
    $1::bigint,
    $2::text,
    $3::text
)