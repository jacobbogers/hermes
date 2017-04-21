# Hermes (general authentication microservice)

User subscription management microservice for websites

## Installaiton overview

 1. [Installing/Configuration of PostgreSQL backend and DB objects creation](#docs/installing-postgresql96-centos7.md)

 Simple usage

 ```javascript

   import { hermes } from 'hermes';
   import { app } from 'express';

   app.use('/usr-auth', hermes({
     mailGunApiKey: 'ZERSFCSzerzer235', // your api key from mailgun
     dbName:'bookbarter',
     dbUser:'bookbarter',
     dbPassword: 'xxxxx'
   });
 ```





