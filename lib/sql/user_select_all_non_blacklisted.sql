-- check for a special token in his user props
select 
  u.id usr_id,
  u.name user_name,
  u.email user_email,
  --
  up.prop_name,
  up.prop_value 
from
  auth.user u
  left join auth.user_props up on (u.id = up.fk_user)
WHERE
  up.id NOT in (select SS0.fk_user from user_props SS0 where SS0.name = 'BLACKLISTED')