import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import http from "https";
import { getActiveConnectionIds } from "./sqs";

const apiClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKETS_CONNECTIONS_API,
});

export async function procesStreamChunks() {
  const url = new URL(process.env.STREAMING_API_URL!);
  const req = http.request(url, (res) => {
    res.on("data", async (chunk) => {
      // TODO: decode chunk. split new lines and consider the line with data string and JSON.parse its value
      await sendChunkToClients(chunk.toString());
    });

    res.on("end", () => {
      console.log("Response completed");
    });
  });

  req.on("error", (error) => {
    console.error("Error:", error);
  });

  req.end();
}

async function sendChunkToClients(payload: string) {
  const activeConnectionIds = getActiveConnectionIds();
  console.log(`sending chunk to ${activeConnectionIds.size} clients`);
  for await (const id of activeConnectionIds) {
    const postData = {
      Data: payload,
      ConnectionId: id,
    };
    try {
      await apiClient.send(new PostToConnectionCommand(postData));
    } catch (err) {
      console.error("Failed to send chunks to connection id", id, err);
    }
  }
}
