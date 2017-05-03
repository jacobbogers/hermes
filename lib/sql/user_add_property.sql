INSERT INTO auth.user_props (fk_user, prop_name, prop_value) 
VALUES ($1::bigint, $2::text, $3::text)
 ON CONFLICT (fk_user,prop_name) DO UPDATE 
  SET prop_value = $3::text;