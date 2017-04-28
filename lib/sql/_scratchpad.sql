select
 -- user
 u.id usr_id, 
 u.name,
 u.email,
 -- user props
 up.name u_prop_name,
 up.value u_prop_value,
 -- tokens
 iut.ip_addr,
 iut.timestamp_issued ts_issuance,
 iut.timestamp_expire ts_expire,
 iut.fk_cookie_template cookie_template,
 -- session (token) props
 sp.session_prop_name s_prop_name,
 sp.session_prop_value s_prop_value
from
   auth.user u,
   auth.user_props up,
   auth.issued_user_tokens iut,
   auth.session_props sp
where 
  -- user props
  u.id = up.fk_user
  -- 
  and
  -- issued tokens (still active)
  u.id = iut.fk_user(+)
  and 
  iut.revoked_reason between 0 and 1  --non revoked tokens
  -- session(token) props
  and 
  iut.id = sp.fk_token_id(+)
  

-- query non revoked cookies (could be expired)
select
 -- user
 u.id usr_id, 
 u.name,
 u.email,
 -- user props
 up.name u_prop_name,
 up.value u_prop_value,
  -- tokens
 iut.id user_token,
 iut.ip_addr,
 iut.purpose issuance_purpose ,
 iut.timestamp_issued ts_issuance,
 iut.timestamp_expire ts_expire,
 iut.timestamp_revoked ts_revoked,
 iut.revoke_reason revoke_reason,
 iut.fk_cookie_template_id cookie_template_id,
 -- session (token) props
 sp.session_prop_name s_prop_name,
 sp.session_prop_value s_prop_value
 from
   auth.user u left join  auth.user_props up on ( u.id = up.fk_user)
   left join auth.issued_user_tokens iut on (iut.fk_user = u.id and iut.revoke_reason is  null)
   left join auth.session_props sp on (iut.id = sp.fk_token_id)


-- query revoked cookies (expired or invalidated)
select
 -- user
 u.id usr_id, 
 u.name,
 u.email,
 -- user props
 up.name u_prop_name,
 up.value u_prop_value,
  -- tokens
 iut.id user_token,
 iut.ip_addr,
 iut.purpose issuance_purpose ,
 iut.timestamp_issued ts_issuance,
 iut.timestamp_expire ts_expire,
 iut.timestamp_revoked ts_revoked,
 iut.revoke_reason revoke_reason,
 iut.fk_cookie_template_id cookie_template_id,
 -- session (token) props
 sp.session_prop_name s_prop_name,
 sp.session_prop_value s_prop_value
 from
   auth.user u left join  auth.user_props up on ( u.id = up.fk_user)
   left join auth.issued_user_tokens iut on (iut.fk_user = u.id and iut.revoke_reason is not null)
   left join auth.session_props sp on (iut.id = sp.fk_token_id)

-- invalidate perticular token
 update  auth.issued_user_tokens as iut set revoke_reason = ',,' , timestamp_revoked = 354234
   where fk_user = 4;


 
 
   insert into auth.session_props(fk_token_id, session_prop_name, session_prop_value) 
     values ('hash_slkjgfhsdfngoeriu', 'shopcart','on'); 

      insert into auth.session_props(fk_token_id, session_prop_name, session_prop_value) 
     values ('hash_slkjgfhsdfngoeriu', 'foods','healthy');   


     
-- query revoked cookies (could be expired)
select
 -- user
 u.id usr_id, 
 u.name,
 u.email,
 -- user props
 up.name u_prop_name,
 up.value u_prop_value,
  -- tokens
 iut.id user_token,
 iut.ip_addr,
 iut.purpose issuance_purpose ,
 iut.timestamp_issued ts_issuance,
 iut.timestamp_expire ts_expire,
 iut.timestamp_revoked ts_revoked,
 iut.revoke_reason revoke_reason,
 iut.fk_cookie_template_id cookie_template_id,
 -- session (token) props
 sp.session_prop_name s_prop_name,
 sp.session_prop_value s_prop_value
 from
   auth.issued_user_tokens iut join auth.user u on (iut.fk_user = u.id)
     left join auth.session_props sp on (iut.id = sp.fk_token_id)
     left join auth.user_props up on ( u.id = up.fk_user)
 where 
    iut.revoke_reason is not null    

--   auth.user u left join  auth.user_props up on ( u.id = up.fk_user)
  -- left join auth.issued_user_tokens iut on (iut.fk_user = u.id and iut.revoke_reason is  null)
  -- left join auth.session_props sp on (iut.id = sp.fk_token_id)

  -- query non revoked cookies (could be expired)
select
 -- user
 u.id usr_id, 
 u.name,
 u.email,
 -- user props
 up.name u_prop_name,
 up.value u_prop_value,
  -- tokens
 iut.id user_token,
 iut.ip_addr,
 iut.purpose issuance_purpose ,
 iut.timestamp_issued ts_issuance,
 iut.timestamp_expire ts_expire,
 iut.timestamp_revoked ts_revoked,
 iut.revoke_reason revoke_reason,
 iut.fk_cookie_template_id cookie_template_id,
 -- session (token) props
 sp.session_prop_name s_prop_name,
 sp.session_prop_value s_prop_value
 from
   auth.issued_user_tokens iut join auth.user u on (iut.fk_user = u.id)
     left join auth.session_props sp on (iut.id = sp.fk_token_id)
     left join auth.user_props up on ( u.id = up.fk_user)
 where 
    iut.revoke_reason is null 


update auth.issued_user_tokens iut set     