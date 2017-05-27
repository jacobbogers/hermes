select
  u.id usr_id,
  u.name user_name,
  u.email user_email,
  up.prop_name,
  up.prop_value
from
  auth.user u
  left join auth.user_props up on (u.id = up.fk_user_id and up.invisible = false)
