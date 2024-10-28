import { listenToConnectionIdsChanges, loadInitialConnectionIds } from "./sqs";
import { procesStreamChunks } from "./streamhandler";

export const main = async () => {
  await loadInitialConnectionIds();
  listenToConnectionIdsChanges();
  procesStreamChunks();
};

main();
