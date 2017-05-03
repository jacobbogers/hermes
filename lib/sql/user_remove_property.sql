delete from auth.user_props
  where fk_user = $1::bigint and prop_name = $2::text