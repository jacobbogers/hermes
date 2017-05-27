insert into auth.user (
    name,
    email
)
select  
    $1::text,
    $2::text
)
RETURNING id, name , email 