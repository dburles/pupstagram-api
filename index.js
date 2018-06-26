const { ApolloServer, gql } = require("apollo-server");
const { RESTDataSource } = require("apollo-datasource-rest");
const { unique } = require("shorthash");
const _ = require("lodash");

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    dogs: [Dog]
    dog(breed: String!): Dog
  }

  type Dog {
    id: String!
    breed: String!
    displayImage: String
    images: [Image]
    subbreeds: [String]
  }

  type Image {
    url: String!
    id: String!
  }
`;

const createDog = (subbreeds, breed) => ({
  breed,
  id: unique(breed),
  subbreeds: subbreeds.length > 0 ? subbreeds : null
});

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    dogs: async (root, _args, { dataSources }) => {
      return _.map(await dataSources.dogsAPI.getDogs(), createDog);
    },
    dog: async (root, { breed }, { dataSources }) => {
      return createDog(await dataSources.dogsAPI.getSubbreeds(breed), breed);
    }
  },
  Dog: {
    displayImage: async ({ breed }, _args, { dataSources }) => {
      return dataSources.dogsAPI.getDisplayImage(breed);
    },
    images: async ({ breed }, _args, { dataSources }) => {
      const images = await dataSources.dogsAPI.getImages(breed);
      return images.map(image => ({ url: image, id: unique(image) }));
    }
  }
};

class DogsDataSource extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = "https://dog.ceo/api";
  }

  async getDogs() {
    unwrap(this.get('breeds/list/all'));
  }

  async getSubbreeds(breed) {
    return unwrap(this.get(`breed/${breed}/list`));
  }

  async getDisplayImage(breed) {
    return unwrap(this.get(`breed/${breed}/images/random`));
  }

  async getImages(breed) {
    return unwrap(this.get(`breed/${breed}/images`));
  }
}

async function unwrap(result) {
  return (await result).message;
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    dogsAPI: new DogsDataSource()
  })
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
