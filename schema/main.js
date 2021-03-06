

// // const {
// //   GraphQLSchema,
// //   GraphQLObjectType,
// //   GraphQLString,
// //   GraphQLInt,
// //   GraphQLList
// // } = require('graphql');

// // const QuoteType = new GraphQLObjectType({
// //   name:'Quote',
// //   field:{
// //     id:{
// //       type:GraphQLString,
// //       resolve:object => object._id
// //     },
// //     text:{ type :GraphQLString},
// //     author:{type:GraphQLString}
// //   }
// // })

// // const queryType = new GraphQLObjectType({
// //   name:'RootQuery',
// //   field:{
// //     allQuotes:{
// //       type:new GraphQLList(QuoteType),
// //       resolve:{_,args,{db}} => {
// //         console.log(typeof(db.collection('quotes').find());
// //         db.collection('quotes').find().toArray();
// //       }
// //     },
// //   }
// // })

// // const QuoteSchema = new GraphQLSchema()
// const {
//   GraphQLSchema,
//   GraphQLObjectType,
//   GraphQLString,
//   GraphQLInt,
//   GraphQLList,
//   GraphQLBoolean,
//   GraphQLEnumType
// } = require('graphql');

// const QuoteType = new GraphQLObjectType({
//   name: 'Quote',
//   fields: {
//     id: {
//       type: GraphQLString,
//       resolve: obj => obj._id
//     },
//     text: { type: GraphQLString },
//     author: { type: GraphQLString }
//   }
// });

// const QuotesLibraryType = new GraphQLObjectType({
//   name: 'QuotesLibrary',
//   fields: {
//      allQuotes: {
//       type: new GraphQLList(QuoteType),
//       description: 'A list of the quotes in the database',
//       resolve: (_, args, { db }) =>
//         db.collection('quotes').find().toArray()
//     }
//   }
// });

// // const queryType = new GraphQLObjectType({
// //   name: 'RootQuery',
// //   fields: {
// //     allQuotes: {
// //       type: new GraphQLList(QuoteType),
// //       description: 'A list of the quotes in the database',
// //       resolve: (_, args, { db }) =>
// //         db.collection('quotes').find().toArray()
// //     }
// //   }
// // });

// const quotesLibrary = {}
// const queryType = new GraphQLObjectType({
//   name: 'RootQuery',
//   fields: {
//     allQuotes: {
//       type: new GraphQLList(QuotesLibraryType),
//       description: 'A list of the quotes in the database',
//       resolve: () => quotesLibrary

//     }
//   }
// });

// const mySchema = new GraphQLSchema({
//   query: queryType
// });

// module.exports = mySchema;

const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLBoolean,
  GraphQLEnumType
} = require('graphql');
const {
  globalIdField,
  fromGlobalId,
  nodeDefinitions,
  connectionDefinitions,
  connectionArgs,
  connectionFromArray,
  connectionFromPromisedArray,
  mutationWithClientMutationId
} = require('graphql-relay');

const { ObjectID } = require('mongodb');
const globalIdFetcher = (globalId, { db }) => {
  const { type, id } = fromGlobalId(globalId);
  switch (type) {
    case 'QuotesLibrary':
      // We only have one quote library      
      return quotesLibrary;
    case 'Quote':
      return db.collection('quotes').findOne(ObjectID(id));
    default:
      return null;
  }
};
const globalTypeResolver = obj => obj.type || QuoteType;

const { nodeInterface, nodeField } = nodeDefinitions(globalIdFetcher, globalTypeResolver);


const QuoteType = new GraphQLObjectType({
  name: 'Quote',
  interfaces: [nodeInterface],
  fields: {
    id: globalIdField('Quote', obj => obj._id),
    text: { type: GraphQLString },
    author: { type: GraphQLString },
    likesCount: {
      type: GraphQLInt,
      resolve: obj => obj.likesCount || 0
    }
  }
});

const { connectionType: QuotesConnectionType } =
connectionDefinitions({
  name: 'Quote',
  nodeType: QuoteType
});
let connectionArgsWithSearch = connectionArgs;
connectionArgsWithSearch.searchTerm = { type: GraphQLString };

const QuotesLibraryType = new GraphQLObjectType({
  name: 'QuotesLibrary',
  interfaces: [nodeInterface],
  fields: {
    // allQuotes: {
    //   type: new GraphQLList(QuoteType),
    //   description: 'A list of the quotes in the database',
    //   resolve: (_, args, { db }) =>
    //     db.collection('quotes').find().toArray()
    // }
    id: globalIdField('QuotesLibrary'),
    quotesConnection: {
      type: QuotesConnectionType,
      description: 'A list of the quotes in the database',
      args: connectionArgsWithSearch,
      resolve: (_, args, { db }) => {
        let findParams = {};
        if (args.searchTerm) {
          findParams.text = new RegExp(args.searchTerm, 'i');
        }
        return connectionFromPromisedArray(
          db.collection('quotes').find(findParams).toArray(),
          args
        );
      }

    }
  }
});

const quotesLibrary = { type: QuotesLibraryType };

const queryType = new GraphQLObjectType({
  name: 'RootQuery',

  fields: {
    node: nodeField,
    quotesLibrary: {
      type: QuotesLibraryType,
      description: 'The Quotes Library',
      resolve: () => quotesLibrary
    }
  }
});

const thumbsUpMutation = mutationWithClientMutationId({
  name: 'ThumbsUpMutation',
  inputFields: {
    quoteId: { type: GraphQLString }
  },
  outputFields: {
    quote: {
      type: QuoteType,
      resolve: obj => obj
    }
  },
  mutateAndGetPayload: (params, { db }) => {
    const { id } = fromGlobalId(params.quoteId);
    return  Promise.resolve(
            db.collection('quotes').updateOne({ _id: ObjectID(id) }, { $inc: { likesCount: 1 } }))
            .then(result =>
                 db.collection('quotes').findOne(ObjectID(id))
            );
  }
});
const mutationType = new GraphQLObjectType({
  name: 'RootMutation',
  fields: {
    thumbsUp: thumbsUpMutation
  }
});


const mySchema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType
});

module.exports = mySchema;
