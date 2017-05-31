# Hermes (general authentication micro-service)

User subscription management micro-service for websites. Build in React components on a semi-transparent background sitting on top of your app during
authentication.

## Installation overview

 1. [Installing/Configuration of PostgreSQL back-end and DB objects creation](docs/installing-postgresql96-centos7.md)

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

## GUI Demo
![Demo](https://media.giphy.com/media/3o7buhG91Jk7T2KYqQ/giphy.gif)


