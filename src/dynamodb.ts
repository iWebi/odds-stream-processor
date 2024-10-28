import { DynamoDBClient, QueryOutput, ScanOutput } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import * as AWSXRay from "aws-xray-sdk";
import { AppError, DynamoItemsResponse, PageRequest } from "./types";
import { isAppError, isEmpty } from "./utils";

export const MAX_DYNAMODB_PAGELENGTH = 6000; // Either 6000 records OR max 1MB worth of records in each READ call
export const DEFAULT_PAGE_SIZE = 500;

export function buildDocClient() {
  const marshallOptions = {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: false, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: true, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: false, // false, by default.
  };

  const unmarshallOptions = {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
  };

  const dynamodb = AWSXRay.captureAWSv3Client(
    new DynamoDBClient({
      region: process.env.AWS_REGION,
    }) as any
  ) as DynamoDBClient;
  return DynamoDBDocumentClient.from(dynamodb, { marshallOptions, unmarshallOptions });
}

const ddbDocClient = buildDocClient();

export async function getItems(params: any): Promise<DynamoItemsResponse<any>> {
  const response = await ddbDocClient.send(new QueryCommand(params));
  if (response.Count === 0) {
    return {
      Count: 0,
      LastEvaluatedKey: undefined,
      body: [],
      statusCode: 200,
      statusType: "OK",
    };
  }
  return collectionResponse(response);
}

function collectionResponse(data: ScanOutput | QueryOutput) {
  const output = data.Items!;
  return {
    Count: output?.length,
    LastEvaluatedKey: data.LastEvaluatedKey,
    body: output,
    statusCode: 200,
    statusType: "OK",
  };
}

export async function getAllItemsByHashKey<T>(hashKey: string, tableName: string): Promise<T[]> {
  const data: T[] = [];
  const pageRequest: PageRequest = { limit: MAX_DYNAMODB_PAGELENGTH } as PageRequest;

  while (true) {
    try {
      const params = {
        KeyConditionExpression: "hashKey = :hashKey",
        ExpressionAttributeValues: {
          ":hashKey": hashKey,
        },
        TableName: tableName,
      } as QueryCommandInput;
      addPageParams(params, pageRequest);
      const response = await getItems(params);
      data.push(...response.body);
      if (isEmpty(response.LastEvaluatedKey)) {
        break;
      }
      pageRequest.ExclusiveStartkey = response.LastEvaluatedKey;
    } catch (error) {
      if (isAppError(error) && (error as AppError).statusCode === 404) {
        // ignore no data scenario
        break;
      }
      // all other errors, rethrow
      throw error;
    }
  }
  return data;
}

export function addPageParams(params: QueryCommandInput, pageRequest?: PageRequest) {
  if (!pageRequest) {
    return;
  }
  if (pageRequest.ExclusiveStartkey) {
    params.ExclusiveStartKey = pageRequest.ExclusiveStartkey;
  }
  if (pageRequest.direction === "Backward") {
    params.ScanIndexForward = false;
  }
  params.Limit = pageRequest.limit ?? DEFAULT_PAGE_SIZE;
}
