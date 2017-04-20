import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';

import Quote from './quote';

import { debounce } from 'lodash';
import SearchForm from './search-form';

class QuotesLibrary extends React.Component {
  constructor(props) { 
    super(props);
    this.search = debounce(this.search.bind(this), 3000); 
  }
  search(searchTerm) { 
    this.props.relay.setVariables({ searchTerm }); 
  }
  render() {
    return ( 
    < div className = "quotes-list" > 
      <SearchForm searchAction={this.search}></SearchForm>
      {
        this.props.library.quotesConnection.edges.map(quote =>
          < Quote key = { quote.node.id }
          quote = { quote.node }
          />
        )
      } 
    < /div>)
  }
}

// QuotesLibrary = Relay.createContainer(QuotesLibrary, {
//   fragments: {
//     library: () => Relay.QL `
//       fragment AllQuotes on QuotesLibrary {
//         allQuotes {
//           id
//           ${Quote.getFragment('quote')}
//         }
//       }
//     `
//   }
// });
QuotesLibrary = Relay.createContainer(QuotesLibrary, {
  initialVariables: { searchTerm: '' },
  fragments: {
    library: () => Relay.QL `
      fragment on QuotesLibrary {
        quotesConnection(first:100, searchTerm:$searchTerm) {
          edges {
            node {
              id
              ${Quote.getFragment('quote')}
            }
          }
        }
      }
    `
  }
});
class AppRoute extends Relay.Route {
  static routeName = 'App';
  static queries = {
    library: (Component) => Relay.QL `
      query QuotesLibrary {
        quotesLibrary {
          ${Component.getFragment('library')}
        }
      }
    `
  }
}

ReactDOM.render( < Relay.RootContainer Component = { QuotesLibrary }
  route = { new AppRoute() }
  />,
  document.getElementById('react')
);
