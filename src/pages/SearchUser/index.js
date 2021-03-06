import { useState } from 'react';
import { createPaginationContainer, graphql, QueryRenderer } from 'react-relay/legacy';
import { useRelayEnvironment } from 'react-relay';
import { Button, Spin, Input, Statistic } from 'antd';
import _ from 'lodash';

import UserList from '../../components/UserList';
import QueryRendererWrapper from '../../components/QueryRendererWrapper';
import './index.less';

const DEFAULT_PAGE_SIZE = 15;

const SearchUser = ({ data, defaultSearchText, relay }) => {
  // const [searchText, setSearchText = defaultSearchText] = useState("xyy94813");
  const [loadMore, setLoadMore] = useState(false);

  const userCount = _.get(data, 'users.userCount', 0);

  return (
    <>
      <div className="App-main-content-toolbar">
        <Input.Search
          defaultValue={defaultSearchText}
          onSearch={(val) => {
            if (relay.isLoading()) {
              return;
            }
            relay.refetchConnection(DEFAULT_PAGE_SIZE, () => {}, {
              query: val,
            });
          }}
          enterButton
        />
      </div>
      <div className="SearchUser-list">
        <div className="SearchUser-list-header">
          <Statistic title="User Count" value={userCount} />
        </div>
        <UserList
          data={_.map(_.get(data, 'users.edges'), (item) => item.node)}
          loadMore={
            <div className="SearchUser-list-footer">
              {loadMore ? (
                <Spin />
              ) : relay.hasMore() ? (
                <Button
                  onClick={(e) => {
                    if (loadMore) {
                      return;
                    }
                    setLoadMore(true);
                    relay.loadMore(DEFAULT_PAGE_SIZE, (error) => {
                      setLoadMore(false);
                      error && console.error(error);
                    });
                  }}
                >
                  Load More
                </Button>
              ) : null}
            </div>
          }
        />
      </div>
    </>
  );
};

const QUERY = graphql`
  query SearchUserQuery($count: Int, $cursor: String, $query: String!) {
    ...SearchUser_data @arguments(count: $count, cursor: $cursor, query: $query)
  }
`;

const SearchUserContainer = createPaginationContainer(
  SearchUser,
  {
    data: graphql`
      fragment SearchUser_data on Query
      @argumentDefinitions(
        count: { type: "Int", defaultValue: 10 }
        cursor: { type: "String" }
        query: { type: "String!" }
      ) {
        users: search(first: $count, after: $cursor, query: $query, type: USER)
          @connection(key: "UserList_users") {
          edges {
            cursor
            node {
              ...UserList_data
            }
          }
          userCount
          pageInfo {
            startCursor
            endCursor
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `,
  },
  {
    direction: 'forward',
    getConnectionFromProps(props) {
      return props?.data?.users || null;
    },
    getFragmentVariables(prevVars, totalCount) {
      return {
        ...prevVars,
        count: totalCount,
      };
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        query: props.defaultSearchText,
        ...fragmentVariables,
        count,
        cursor,
        // ...props
      };
    },
    query: QUERY,
  },
);

export default (props) => {
  const environment = useRelayEnvironment();
  return (
    <QueryRenderer
      environment={environment}
      query={QUERY}
      variables={{
        query: props.defaultSearchText || '',
        count: DEFAULT_PAGE_SIZE,
      }}
      render={QueryRendererWrapper((_props) => (
        <SearchUserContainer {...props} data={_props} />
      ))}
    />
  );
};
