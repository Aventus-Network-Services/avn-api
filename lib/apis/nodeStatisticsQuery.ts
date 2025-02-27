import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Utils } from '../utils';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

export interface NodeStatisticsConfig {
  endpoint?: string;
  timeout?: number;
  axiosInstance?: AxiosInstance;
  headers?: Record<string, string>;
}

export class NodeStatisticsError extends Error {
  public readonly originalError?: Error;
  public readonly graphQLErrors?: any[];
  public readonly statusCode?: number;
  
  constructor(message: string, options?: {
    originalError?: Error;
    graphQLErrors?: any[];
    statusCode?: number;
  }) {
    super(message);
    this.name = 'NodeStatisticsError';
    
    if (options) {
      this.originalError = options.originalError;
      this.graphQLErrors = options.graphQLErrors;
      this.statusCode = options.statusCode;
    }
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NodeStatisticsError);
    }
  }
}

export class NodeStatistics {
  private readonly graphqlEndpoint: string;
  private readonly client: AxiosInstance;
  
  constructor(config?: NodeStatisticsConfig) {
    this.graphqlEndpoint = config?.endpoint || 'https://node-manager.mainnet.truth-network.io/graphql';
    
    if (config?.axiosInstance) {
      this.client = config.axiosInstance;
    } else {
      const axiosConfig: AxiosRequestConfig = {
        timeout: config?.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          ...(config?.headers || {})
        }
      };
      
      this.client = axios.create(axiosConfig);
    }
  }
  
  private async executeGraphQLQuery<T>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      const response: AxiosResponse<GraphQLResponse<T>> = await this.client({
        url: this.graphqlEndpoint,
        method: 'POST',
        data: JSON.stringify({
          query,
          variables
        })
      });
      
      if (response.data.errors && response.data.errors.length > 0) {
        throw new NodeStatisticsError(
          `GraphQL errors: ${response.data.errors[0].message}`,
          { graphQLErrors: response.data.errors }
        );
      }
      
      if (response.data.data === undefined) {
        throw new NodeStatisticsError('GraphQL response missing data');
      }
      
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data as GraphQLResponse<any> | undefined;
        
        throw new NodeStatisticsError(
          `GraphQL request failed: ${error.message}`,
          {
            originalError: error,
            statusCode,
            graphQLErrors: responseData?.errors
          }
        );
      }
      
      if (error instanceof Error) {
        throw new NodeStatisticsError(`Unexpected error: ${error.message}`, { originalError: error });
      } else {
        throw new NodeStatisticsError(`Unexpected error: ${String(error)}`);
      }
    }
  }
  
  async getAccountRewardsLast24Hours(accountId: string): Promise<bigint> {
    Utils.validateAccount(accountId);
    
    const query = `
      query GetAccountRewardsLast24Hours($accountId: String!) {
        getAccountRewardsLast24Hours(accountId: $accountId)
      }
    `;
    
    const variables = { accountId };
    
    try {
      const result = await this.executeGraphQLQuery<{ getAccountRewardsLast24Hours: string }>(query, variables);
      return BigInt(result.getAccountRewardsLast24Hours);
    } catch (error) {
      if (error instanceof NodeStatisticsError) {
        throw error;
      } else if (error instanceof Error) {
        throw new NodeStatisticsError(`Failed to get account rewards for last 24 hours: ${error.message}`, 
          { originalError: error });
      } else {
        throw new NodeStatisticsError(`Failed to get account rewards for last 24 hours: ${String(error)}`);
      }
    }
  }
  
  async getAccountRewardsInTimeRange(accountId: string, startTime: Date, endTime: Date): Promise<bigint> {
    Utils.validateAccount(accountId);
    this.validateDateRange(startTime, endTime);
    
    const formattedStartTime = startTime.toISOString();
    const formattedEndTime = endTime.toISOString();
    
    const query = `
      query GetAccountRewardsInTimeRange($accountId: String!, $startTime: String!, $endTime: String!) {
        getAccountRewardsInTimeRange(accountId: $accountId, startTime: $startTime, endTime: $endTime)
      }
    `;
    
    const variables = { 
      accountId,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    };
    
    try {
      const result = await this.executeGraphQLQuery<{ getAccountRewardsInTimeRange: string }>(query, variables);
      return BigInt(result.getAccountRewardsInTimeRange);
    } catch (error) {
      if (error instanceof NodeStatisticsError) {
        throw error;
      } else if (error instanceof Error) {
        throw new NodeStatisticsError(`Failed to get account rewards in time range: ${error.message}`, 
          { originalError: error });
      } else {
        throw new NodeStatisticsError(`Failed to get account rewards in time range: ${String(error)}`);
      }
    }
  }
  
  async getAccountLifetimeRewards(accountId: string): Promise<bigint> {
    Utils.validateAccount(accountId);
    
    const query = `
      query GetAccountLifetimeRewards($accountId: String!) {
        getAccountLifetimeRewards(accountId: $accountId)
      }
    `;
    
    const variables = { accountId };
    
    try {
      const result = await this.executeGraphQLQuery<{ getAccountLifetimeRewards: string }>(query, variables);
      return BigInt(result.getAccountLifetimeRewards);
    } catch (error) {
      if (error instanceof NodeStatisticsError) {
        throw error;
      } else if (error instanceof Error) {
        throw new NodeStatisticsError(`Failed to get account lifetime rewards: ${error.message}`, 
          { originalError: error });
      } else {
        throw new NodeStatisticsError(`Failed to get account lifetime rewards: ${String(error)}`);
      }
    }
  }
  
  async getNodeTotalRewards(nodeId: string): Promise<bigint> {
    Utils.validateStringIsPopulated(nodeId);
    
    const query = `
      query GetNodeTotalRewards($nodeId: String!) {
        getNodeTotalRewards(nodeId: $nodeId)
      }
    `;
    
    const variables = { nodeId };
    
    try {
      const result = await this.executeGraphQLQuery<{ getNodeTotalRewards: string }>(query, variables);
      return BigInt(result.getNodeTotalRewards);
    } catch (error) {
      if (error instanceof NodeStatisticsError) {
        throw error;
      } else if (error instanceof Error) {
        throw new NodeStatisticsError(`Failed to get node total rewards: ${error.message}`, 
          { originalError: error });
      } else {
        throw new NodeStatisticsError(`Failed to get node total rewards: ${String(error)}`);
      }
    }
  }
  
  async getAccountNodesCount(accountId: string): Promise<number> {
    Utils.validateAccount(accountId);
    
    const query = `
      query GetAccountNodesCount($accountId: String!) {
        getAccountNodesCount(accountId: $accountId)
      }
    `;
    
    const variables = { accountId };
    
    try {
      const result = await this.executeGraphQLQuery<{ getAccountNodesCount: number }>(query, variables);
      return result.getAccountNodesCount;
    } catch (error) {
      if (error instanceof NodeStatisticsError) {
        throw error;
      } else if (error instanceof Error) {
        throw new NodeStatisticsError(`Failed to get account nodes count: ${error.message}`, 
          { originalError: error });
      } else {
        throw new NodeStatisticsError(`Failed to get account nodes count: ${String(error)}`);
      }
    }
  }

  async getRewardCountInTimeRange(accountId: string, startTime: Date, endTime: Date): Promise<number> {
    Utils.validateAccount(accountId);
    this.validateDateRange(startTime, endTime);
    
    const formattedStartTime = startTime.toISOString();
    const formattedEndTime = endTime.toISOString();
    
    const query = `
      query GetRewardCountInTimeRange($accountId: String!, $startTime: String!, $endTime: String!) {
        getRewardCountInTimeRange(accountId: $accountId, startTime: $startTime, endTime: $endTime)
      }
    `;
    
    const variables = {
      accountId,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    };
    
    try {
      const result = await this.executeGraphQLQuery<{ getRewardCountInTimeRange: number }>(query, variables);
      return result.getRewardCountInTimeRange;
    } catch (error) {
      if (error instanceof NodeStatisticsError) {
        throw error;
      } else if (error instanceof Error) {
        throw new NodeStatisticsError(`Failed to get reward count in time range: ${error.message}`, 
          { originalError: error });
      } else {
        throw new NodeStatisticsError(`Failed to get reward count in time range: ${String(error)}`);
      }
    }
  }
  
  async getAverageRewardInTimeRange(accountId: string, startTime: Date, endTime: Date): Promise<bigint> {
    Utils.validateAccount(accountId);
    this.validateDateRange(startTime, endTime);
    
    const formattedStartTime = startTime.toISOString();
    const formattedEndTime = endTime.toISOString();
    
    const query = `
      query GetAverageRewardInTimeRange($accountId: String!, $startTime: String!, $endTime: String!) {
        getAverageRewardInTimeRange(accountId: $accountId, startTime: $startTime, endTime: $endTime)
      }
    `;
    
    const variables = {
      accountId,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    };
    
    try {
      const result = await this.executeGraphQLQuery<{ getAverageRewardInTimeRange: string }>(query, variables);
      return BigInt(result.getAverageRewardInTimeRange);
    } catch (error) {
      if (error instanceof NodeStatisticsError) {
        throw error;
      } else if (error instanceof Error) {
        throw new NodeStatisticsError(`Failed to get average reward in time range: ${error.message}`, 
          { originalError: error });
      } else {
        throw new NodeStatisticsError(`Failed to get average reward in time range: ${String(error)}`);
      }
    }
  }
  
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new NodeStatisticsError('Invalid start date provided');
    }
    
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
      throw new NodeStatisticsError('Invalid end date provided');
    }
    
    if (startDate > endDate) {
      throw new NodeStatisticsError('Start date must be before or equal to end date');
    }
  }
}