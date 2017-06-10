

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
            data: UserInfo
        }

        # Your User Information
        type UserInfo {
            # some more comments
            name: String
            email: String
            state: String
        }

        type TokenExpire {
            expire:String
            errors: [AuthError!]
        }

        type Query {
             # Get the current status of a visitor
             currentUser: AuthResult
             isEmailRegistered (email: String!): AuthResult
             isUserNameRegistered(name: String!): AuthResult
             serverInfo: ServerInfo
             tokenExpire: TokenExpire
        }

        type Mutation {
            login(email:String!, password:String! ): AuthResult
            logout: AuthResult
            createUser(name:String! , email:String!, password:String!): AuthResult
        }
        
        #schema {
        #    query: Query
        #    mutation: Mutation
        #}
        `
];
