insert into auth.session_cookies_template ( 
  id,
  cookie_name, 
  path,
  max_age, -- in ms
  http_only,
  secure,
  domain,
  same_site,
  tolling,
  template_name
)
values
  ( 0, '', null, 86400000, null, null, null, null, null, 'default_token'),
  ( 2, 'hermes.session', '/', 86400000, true, false, null, true, true, 'default_ cookie'),
  ( 3, 'hermes.session', '/', 86400000, true, true, null,true, true, 'secure_cookie');

/*
   id |  cookie_name   | path | max_age  | http_only | secure | domain | same_site | rolling | template_name
----+----------------+------+----------+-----------+--------+--------+-----------+---------+----------------
  0 |                |      | 86400000 |           |        |        |           |         | default_token
  1 | hermes.session | /    | 10800000 | t         | f      |        | t         | t       | default_cookie
  3 | hermes.session | /    | 10800000 | t         | t      |        | t         | t       | secure_cookie
*/

insert into auth.user (
  name,
  email
)
values ('anonymous');
/*
 id |   name    | email
----+-----------+-------
 15 | anonymous |
*/