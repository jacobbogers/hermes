

export const schema: string = `
  type User {
      id: Int!,
      name: String!
      email: String!
      userProps:[UserProperty!]
  }

  type UserProperty {
      propName: String!
      propValue: String!
  }

`;

