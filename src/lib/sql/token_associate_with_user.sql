UPDATE auth.issued_user_tokens AS iut
    SET fk_user_id = $1::BIGINT
    WHERE iut.id = $2::TEXT
RETURNING id, fk_user_id;
