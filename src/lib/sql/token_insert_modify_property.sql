INSERT INTO auth.session_props (fk_token_id, session_prop_name, session_prop_value, invisible) 
  select 
     $1::text as fk_token_id,
     tokens.name,
     tokens.value, 
     tokens.invisible
  from unnest( $2::text[], $3::text[], $4::boolean[]) as tokens(name,value,invisible)
ON CONFLICT (fk_token_id,session_prop_name) DO UPDATE 
  SET session_prop_value = EXCLUDED.session_prop_value,
      invisible = EXCLUDED.invisible
RETURNING fk_token_id, session_prop_name, session_prop_value, invisible  

    


