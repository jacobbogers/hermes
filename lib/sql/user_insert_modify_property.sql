INSERT INTO auth.user_props (fk_user_id, prop_name, prop_value, invisible) 
  select 
     $1::text as fk_user_id,
     up.name,
     up.value, 
     up.invisible
  from unnest( $2::text[], $3::text[], $4::boolean[]) as up(name,value,invisible)
ON CONFLICT (fk_token_id,session_prop_name) DO UPDATE 
  SET session_prop_value = EXCLUDED.session_prop_value,
      invisible = EXCLUDED.invisible
RETURNING fk_user_id, prop_name, prop_value, invisible    
