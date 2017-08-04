INSERT INTO auth.user (
    name,
    email
)
SELECT
    $1::TEXT,
    $2::TEXT
)
RETURNING id, name, email;
