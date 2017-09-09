
//general

//const cjson = require('circular-json');

//web
import { Application, NextFunction, Request, Response, Router } from 'express';

//graphql
import { GraphQLOptions } from 'graphql-server-core';
import { graphiqlExpress, graphqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';

//app
import { resolvers } from './graphql_resolvers';
import { typeDefs } from './graphql_typedefs';
import { AuthenticationError, HermesGraphQLConnector } from './hermes_connector';


export interface AuthenticationOptions {
    graphQL_url: string;
}

export function registerAuth(options: AuthenticationOptions, app: Application | Router) {
    //options;

    app.use((request: Request, response: Response, next: NextFunction) => {

        response;

        const sessObj = request.session;
        if (sessObj && (!sessObj._user || !sessObj._hermes)) {
            sessObj.save(err => {
                if (err) {
                    return next(err);
                }
                next();
            });
            return;
        }
        next();
    });

    // register graphQL stuff
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const graphQLOptions: GraphQLOptions = {
        schema,
        // values to be used as context and rootValue in resolvers
        // context?: any,
        // rootValue?: any,
        // function used to format errors before returning them to clients
        //formatError?: Function,
        // additional validation rules to be applied to client-specified queries
        ///validationRules?: Array < ValidationRule >,
        // function applied for each query in a batch to format parameters before passing them to `runQuery`
        //formatParams?: Function,
        // function applied to each response before returning data to clients
        //formatResponse?: Function,
        // a boolean option that will trigger additional debug logging if execution errors occur
        debug: true
    };

    app.use(options.graphQL_url, graphqlExpress((req?: Express.Request) => {
        const asset = HermesGraphQLConnector.createHermesGraphQLConnector(req);

        let errors: AuthenticationError[] = null as any;
        let connector: HermesGraphQLConnector = null as any;
        if (asset instanceof Array) {
            errors = asset;
        }
        else {
            connector = asset;
        }
        return {...graphQLOptions,  context: { connector, errors }} as GraphQLOptions;
    }));

    app.use('/graphiql', graphiqlExpress({ endpointURL: options.graphQL_url }));
}

