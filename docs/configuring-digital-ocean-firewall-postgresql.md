
## Firewall Digital Ocean CentOS7

### Turn on firewall

as superuser do.. (or use sudo)

```bash
   systemctl start firewalld.service
```

check state


```bash
   firewall-cmd --state # shows the text 'running' (or not, if not up)

   #### output
   running
```

### Exploring the defaults

```bash
firewall-cmd --get-active-zones

#### output
public
  interfaces: eth0
block
  interfaces: eth1

firewall-cmd --list-all

#### output

public (active)
  target: default
  icmp-block-inversion: no
  interfaces: eth0
  sources: 
  services: dhcpv6-client http https ntp ssh
  ports: 
  protocols: 
  masquerade: no
  forward-ports: port=443:proto=tcp:toport=8081:toaddr=
	port=80:proto=tcp:toport=8080:toaddr=
  sourceports: 
  icmp-blocks: 
  rich rules: 



firewall-cmd --get-zones

#### output

work drop internal external trusted home dmz public block

## show specific zone configuration (for example "work" , "dmz" and "block")

firewall-cmd --zone=block --list-all

#### output for --zone=work

work
  target: default
  icmp-block-inversion: no
  interfaces: 
  sources: 
  services: dhcpv6-client ssh
  ports: 
  protocols: 
  masquerade: no
  forward-ports: 
  sourceports: 
  icmp-blocks: 
  rich rules: 

#### output for --zone=dmz

dmz
  target: default
  icmp-block-inversion: no
  interfaces: 
  sources: 
  services: ssh
  ports: 
  protocols: 
  masquerade: no
  forward-ports: 
  sourceports: 
  icmp-blocks: 
  rich rules: 


#### output for --zone=block
block
  target: %%REJECT%%
  icmp-block-inversion: no
  interfaces: 
  sources: 
  services: 
  ports: 
  protocols: 
  masquerade: no
  forward-ports: 
  sourceports: 
  icmp-blocks: 
  rich rules:

##  All of them
firewall-cmd  --list-all-zones

#### output (not shown)


## selecting zone for your interface
firewall-cmd --zone=public --change-interface=enp0s3

ifconfig on jacob-bogers.com

enp0s3: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.0.2.15  netmask 255.255.255.0  broadcast 10.0.2.255
        inet6 fe80::49be:4971:fd6b:3637  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:d8:8b:7b  txqueuelen 1000  (Ethernet)
        RX packets 347153  bytes 446891384 (426.1 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 240580  bytes 25544439 (24.3 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1  (Local Loopback)
        RX packets 24838  bytes 2076468 (1.9 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 24838  bytes 2076468 (1.9 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

virbr0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 192.168.122.1  netmask 255.255.255.0  broadcast 192.168.122.255
        ether 52:54:00:3e:3b:a8  txqueuelen 1000  (Ethernet)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

### Changing the Zone of your Interface Permanently, different ways

#### Change the rules on the default zone 
#### Change the ethernet interface to non default zone

```bash

 cd /etc/sysconfig/network-scripts/
 # in our case 
 vi ifcfg-enp0s3
# add to last line 
ZONE=home  ## in this case the default zone "public" is adjusted , so no need to add this line
           ## one could just assign a new zone, but note that it needs sshd enabled or the
           ##   connection will drop

```

#### Assign a new zone as the default zone
```bash
firewall-cmd --set-default-zone=home
```

#### restart network and firewall (if interface is re-assigned to other zone)

```bash
systemctl restart network.service
systemctl restart firewalld.service
```

### Adding services to zones

```bash
firewall-cmd --get-services

#output
RH-Satellite-6 amanda-client amanda-k5-client bacula bacula-client ceph ceph-mon dhcp dhcpv6 dhcpv6-client dns docker-registry dropbox-lansync freeipa-ldap freeipa-ldaps freeipa-replication ftp high-availability http https imap imaps ipp ipp-client ipsec iscsi-target kadmin kerberos kpasswd ldap ldaps libvirt libvirt-tls mdns mosh mountd ms-wbt mysql nfs ntp openvpn pmcd pmproxy pmwebapi pmwebapis pop3 pop3s 
        postgresql 
privoxy proxy-dhcp ptp pulseaudio puppetmaster radius rpc-bind rsyncd samba samba-client sane smtp smtps snmp snmptrap squid ssh synergy syslog syslog-tls telnet tftp tftp-client tinc tor-socks transmission-client vdsm vnc-server wbem-https xmpp-bosh xmpp-client xmpp-local xmpp-server

```

All services have associated xml file in ```/usr/lib/firewalld/services```

for postgres

```xml
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>PostgreSQL</short>
  <description>PostgreSQL Database Server</description>
  <port protocol="tcp" port="5432"/>
</service>
```

### Add postgresql to zone public

```bash
 firewall-cmd --zone=public --add-service=postgresql
 firewall-cmd --zone=public --permanent --add-service=postgresql
```

### enable firewalld permanently

```bash
sudo systemctl enable firewalld
```

<div style="display:flex;justify-content:space-between;">
<a href="creating_database_objects.md">Prev: Installing database objects</a>
<a href="configuring-postgresql-database-connections.md">Next: Configuring PostgreSQL</a>
</div>
