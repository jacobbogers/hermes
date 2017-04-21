# Configuring PostgreSQL connections

Make sure you perform these activities as the ```postgres``` unix user (the one owning the files).

### Creating certificate for authentication with SSL

<p style="color:red;font-weight:bold">Note: this certificate is self-signed, do not use in production</p>

```bash
openssl req -nodes -new -x509 -keyout server.key -out server.cert
```

Copy the server.key and server.cert to $PGDATA directory

```bash
  cp server.key /var/lib/pgsql/9.6/data
  cp server.cert /var/lib/pgsql/9.6/data
```

Change in the ```postgresql.conf``` file the following entries:

```bash
.
ssl=on
.
.
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
.
.
```

### Enabling ssl for remote connections

First go to the data directory of the database cluster.

```bash
cd /var/lib/pgsql/9.6/data # here we are using version 9.6

vi pg_hba.conf
```

#### adjust pg_hba.conf file

Make sure the host (non ssl) entry can only connect via the loop-back
```bash
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
# IPv6 local connections:
host    all             all             ::1/128                 md5
```

Test if this is so, test below command from a remote client, this  must fail
```bash
psql postgresql://jacob-bogers.com:5432/bookbarter?sslmode=disable --user=bookbarter
psql: FATAL:  no pg_hba.conf entry for host "194.154.216.87", user "bookbarter", database "bookbarter", SSL off
```

Enter new entries for SSL connections (in this case we place no restrictions on remote clients IP)
<div style="color:red; font-weight:bold;">Note: we are not using a client certificate for authentication</div>

```bash
hostssl all         all    0.0.0.0/0             md5
hostssl all         all    0.0.0.0/0             md5
```

Restart the server (do this as  superuser)

```bash
systemctl restart postgresql-9.6.service
```

Test the connection (remote machine). It should <span style="color:red;">NOT</span> work for non SSL connections
```bash
psql postgresql://jacob-bogers.com:5432/bookbarter?sslmode=required --user=bookbarter

psql (9.6.2)
SSL connection (protocol: TLSv1.2, cipher: ECDHE-RSA-AES256-GCM-SHA384, bits: 256, compression: off)

```

<div style="display:flex;justify-content:flex-start;">
<a href="configuring-digital-ocean-firewall-postgresql.md">Prev: Configuring CentOS7 firewall</a>
</div>