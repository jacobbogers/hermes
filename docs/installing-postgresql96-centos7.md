
## Installing postgresql-9.6 on centos7

Check what version you have, if it is already 9.6 (or higher version) then you are don, go to [configuration](#configuration).

```bash
   yum list postgresql*

   #output 9.2
```

If want to install a newer version then it is a lower version then the 9.6? ( Yes!, [_Skip below_](#step-3-validate-install) )

Do the following steps:

#### Step 1: Disable the install via the base repository

```bash
cd /etc/yum.repos.d
vi CentOS-Base.repo

// add to [base]
exclude=postgresql*

// add to [updates]
exclude=postgresql*

```

#### Step 2: Add the postgresql 9.6 repo to CentOS and install

``` bash
 yum install https://download.postgresql.org/pub/repos/yum/9.6/redhat/rhel-7-x86_64/pgdg-redhat96-9.6-3.noarch.rpm
```

```bash
 yum install postgresql
```

#### Step 3: Validate Install

Using: ```yum install postgresql*``` will create the database cluster directory ```data```

```bash
cd /var/lib/pgsql/$version/data

#note $version in this cas is '9.6'
cd /var/lib/pgsql/9.6/data
```
check the dbinit.log for correct creation

```bash
 less initdb.log
```

<div style="display:flex;justify-content:flex-end;">
<a href="creating_database_objects.md">Next: Installing database objects</a>
</div>