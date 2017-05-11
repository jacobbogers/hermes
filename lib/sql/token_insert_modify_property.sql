INSERT INTO auth.session_props (fk_token_id, session_prop_name, session_prop_value, invisible) 
  select 
     $1::bigint as fk_token_id, 
     1::text as pname, 
     2::text as pvalue 
     3::boolean as invisible
  from unsset($2::text[],$3::text[],$4::boolean[]) as tokens
ON CONFLICT (fk_token_id,session_prop_name) DO UPDATE 
  SET session_prop_value = tokens.value,
      invisible = token.invisible
RETURNING fk_token_id, session_prop_name, session_prop_value, invisible      


