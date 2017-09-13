SELECT id,
       cookie_name,
       path,
       max_age,
       http_only,
       secure,
       domain,
       same_site,
       rolling,
       template_name
FROM auth.session_cookies_template;
