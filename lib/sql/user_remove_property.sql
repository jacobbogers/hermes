delete from auth.user_props
  where fk_user = $1::bigint and name = $2::text