

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
            serverInfo: ServerInfo!
        }

        # Your User Information
        type UserInfo {
            # some more comments
            name: String
            email: String
            expire: String
        }

        type Query {
             # Get the current status of a visitor
             currentUser: AuthResult
             isEmailRegistered (email: String!): AuthResult
             isUserNameRegistered(name: String!): AuthResult
        }

        type Mutation {
            login(email:String!, password:String! ): AuthResult
            logout: AuthResult
            createUser(name:String! , email:String!, password:String!): AuthResult
        }
        
        schema {
            query: Query
            mutation: Mutation
        }
        `
];
