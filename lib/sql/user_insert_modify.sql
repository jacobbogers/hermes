insert into auth.user (
    name,
    email
)
VALUES 
    $1::text,
    $2::text
)
ON CONFLICT(email) UPDATE set name = EXCLUDED.name
RETURNING id, name , email 