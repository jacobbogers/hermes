begin
  delete from auth.user_props where fk_user = $1::bigint and name = $2::text;
  insert into auth.user_props (
    fk_user,
    prop_name,
    prop_value
)
values (
    $1::bigint,
    $2::text,
    $3::text
);
end;

