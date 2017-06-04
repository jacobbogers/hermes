
# Cheat Sheet

Some useful commands setup related issues (do this before working with the project)

## Code editors

### VS_Code settings

set in user settings:

```json
 "files.eol": "\n"
```



## Git configuration


| type | LINUX | WINDOWS |
| -- | -- | -- |
|  global | ```~/.gitconfig```  | ```C:\Users\[loginname]\.gitconfig ``` |
|  system |  _(usually)_ ```/etc/gitconfig``` | N/A | 


### core.autocrlf = false _( not selected )_

→ This is the default, but most people are encouraged to change this immediately. The result of using false is that Git doesn’t ever mess with line endings on your file. You can check in files with LF or CRLF or CR or some random mix of those three and Git does not care. This can make diffs harder to read and merges more difficult. Most people working in a Unix/Linux world use this value because they don’t have CRLF problems and they don’t need Git to be doing extra work whenever files are written to the object database or written out into the working directory.

### core.autocrlf = true _( not selected )_

This means that Git will process all text files and make sure that CRLF is replaced with LF when writing that file to the object database and turn all LF back into CRLF when writing out into the working directory. This is the recommended setting on Windows because it ensures that your repository can be used on other platforms while retaining CRLF in your working directory.

### core.autocrlf = input _(  SELECT THIS )_

This means that Git will process all text files and make sure that CRLF is replaced with LF when writing that file to the object database. It will not, however, do the reverse. When you read files back out of the object database and write them into the working directory they will still have LFs to denote the end of line. This setting is generally used on Unix/Linux/OS X to prevent CRLFs from getting written into the repository. The idea being that if you pasted code from a web browser and accidentally got CRLFs into one of your files, Git would make sure they were replaced with LFs when you wrote to the object database.



## ```tslint```

Make sure the tsconfig.json file has under ```rules```

```json
 "linebreak-style": [
      true,
      "LF"
    ],
```

To apply fixable rules ```tslint``` has found please execute the following command.

### Example

_In the example below , replace ```lib/**/*/ts``` with your specific fileglob if necessary._

```bash
.\node_modules\.bin\tslint.cmd  -c .\tslint.json 'lib/**/*.ts'
```

## Usefull Postgres Admin command

show session activity

```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = 'bookbarter';
```

kill all sessions, except the one giving the kill order. 

```sql
 SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = 'bookbarter'
```

Sample table data

```sql
bookbarter=> select * from auth.user;
 id |     name     |        email
----+--------------+----------------------
  1 | lucifer696   | vdingbats@gmail.com
  7 | lucifer69c6  | vdwingbats@gmail.com
 15 | anonymous    |
 18 | lucifer696xx | changed@me.lu
 23 | jacobot      | email
(5 rows)

bookbarter=> select * from auth.user_props;
 fk_user_id |  prop_name  |  prop_value  | invisible
------------+-------------+--------------+-----------
         23 | LAST_NAME   | Bovors       | f
         23 | AUTH        | admin        | f
         23 | zipcode     | L1311        | f
          1 | LAST_NAME   | Bovors       | f
          1 | AUTH        | admin        | f
          1 | phoneNr     | +35262163973 | t
          1 | BLACKLISTED |              | f
         18 | password    | dingbats     | f
```

## GraphQL samples
