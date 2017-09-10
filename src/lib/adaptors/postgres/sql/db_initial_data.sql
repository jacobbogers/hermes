INSERT INTO auth.session_cookies_template (
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
VALUES
    (0, '', NULL, 86400000, NULL, NULL, NULL, NULL, NULL, 'default_token'),
    (2, 'hermes.session', '/', 86400000, TRUE, FALSE, NULL, TRUE, TRUE, 'default_ cookie'),
    (3, 'hermes.session', '/', 86400000, TRUE, TRUE, NULL, TRUE, TRUE, 'secure_cookie');

/*
   id |  cookie_name   | path | max_age  | http_only | secure | domain | same_site | rolling | template_name
----+----------------+------+----------+-----------+--------+--------+-----------+---------+----------------
  0 |                |      | 86400000 |           |        |        |           |         | default_token
  1 | hermes.session | /    | 10800000 | t         | f      |        | t         | t       | default_cookie
  3 | hermes.session | /    | 10800000 | t         | t      |        | t         | t       | secure_cookie
*/

INSERT INTO auth.user (
    name,
    email
)
VALUES ('anonymous');
/*
 id |   name    | email
----+-----------+-------
 15 | anonymous |
*/
