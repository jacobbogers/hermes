

export const typeDefs: string[] = [
    `
        type ServerInfo {
            serverTime: String!
        }

        type AuthError {
             context: String
             message: String!
        }

        type AuthResult {
            errors: [AuthError!]
            user: UserInfo
            token: TokenInfo
        }

        type TokenInfo {
            tokenId:String!
            purpose:String!
            revoked: String! # UTC Date
            issued: String! #UTC Date
            expired: String! #UTC Date
        }

        # Your User Information
        type UserInfo {
            # some more comments
            name: String
            email: String
            state: String
        }

        type Query {
             # Get the current status of a visitor
             currentUser: AuthResult
             isEmailRegistered (email: String!): AuthResult
             isUserNameRegistered(name: String!): AuthResult
             serverInfo: ServerInfo
             tokenStatus(token:String):AuthResult
        }

        type Mutation {
            login(email:String!, password:String! ): AuthResult
            logout: AuthResult
            createUser(name:String!, email:String!, password:String!): AuthResult
            activate(email:String!, token:String!): AuthResult
            requestPasswordReset(email:String!): AuthResult
            resetPassword(token:String!, password:String!): AuthResult
            reSendActivation(email: String): AuthResult
            
        }
        
        # schema {
        #    query: Query
        #    mutation: Mutation
        # }
        `
];
