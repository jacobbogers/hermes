insert into auth.user (
    name,
    email
)
values (
    $1::text,
    $2::text
)
RETURNING id