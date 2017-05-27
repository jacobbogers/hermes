INSERT INTO auth.user_props (fk_user_id, prop_name, prop_value, invisible) 
  select 
     $1::bigint as fk_user_id,
     up.name,
     up.value, 
     up.invisible
  from unnest( $2::text[], $3::text[], $4::boolean[]) as up(name,value,invisible)
ON CONFLICT (fk_user_id, prop_name) DO UPDATE 
  SET prop_value = EXCLUDED.prop_value,
      invisible = EXCLUDED.invisible
RETURNING fk_user_id, prop_name, prop_value, invisible    
