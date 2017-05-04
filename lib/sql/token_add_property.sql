INSERT INTO auth.session_props (fk_token_id, session_prop_name, session_prop_value) 
VALUES ($1::text, $2::text, $3::text)
 ON CONFLICT (fk_token_id,session_prop_name) DO UPDATE 
  SET session_prop_value = $3::text;