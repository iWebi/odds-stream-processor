import { DeleteMessageBatchCommand, ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { getAllItemsByHashKey } from "./dynamodb";
import { EntityKey, SQS_NOTIFICATION_TYPE, SqsNotification } from "./types";
import { sleep } from "./utils";

const NO_MESSAGES_SLEEP_INTERVAL_MILLIS = 10_000;
const ACTIVE_CONNECTIONS_HASH_KEY = "ActiveConnections";
const CONNECTIONS_TABLE = "ClientConnections";

const client = new SQSClient({});

export async function receiveMessage(queueUrl: string) {
  return client.send(
    new ReceiveMessageCommand({
      MaxNumberOfMessages: 10,
      MessageAttributeNames: ["All"],
      QueueUrl: queueUrl,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 20,
    })
  );
}

const connectionIds: Set<string> = new Set();
export function getActiveConnectionIds() {
  return connectionIds;
}

// when process starts first time (or restarts), we wont have inmemory cached connection ids
// we need to load them from DynamoDB. This is one time activity per process runtime
export async function loadInitialConnectionIds() {
  const allItems = await getAllItemsByHashKey<EntityKey>(ACTIVE_CONNECTIONS_HASH_KEY, CONNECTIONS_TABLE);
  allItems.forEach((s) => connectionIds.add(s.rangeKey!));
}

export async function listenToConnectionIdsChanges(queueUrl?: string) {
  queueUrl = queueUrl ?? process.env.SQS_QUEUE_URL!;
  console.log("listening for add/remove of connection ids from websocket clients using ", queueUrl);
  while (true) {
    try {
      const { Messages } = await receiveMessage(queueUrl);
      if (!Messages) {
        sleep(NO_MESSAGES_SLEEP_INTERVAL_MILLIS);
        continue;
      }
      Messages.forEach((message) => {
        const notification = JSON.parse(message.Body!) as SqsNotification;
        if (notification.type === SQS_NOTIFICATION_TYPE.ADD_CONNECTION_ID) {
          connectionIds.add(notification.data);
        } else if (notification.type === SQS_NOTIFICATION_TYPE.REMOVE_CONNECTION_ID) {
          connectionIds.delete(notification.data);
        }
      });

      await client.send(
        new DeleteMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: Messages.map((message) => ({
            Id: message.MessageId,
            ReceiptHandle: message.ReceiptHandle,
          })),
        })
      );
    } catch (error) {
      // TODO: handle recoverable errors
      console.error("Exception in listening to connectionId changes", error);
      await sleep(5_000);
    }
  }
}
