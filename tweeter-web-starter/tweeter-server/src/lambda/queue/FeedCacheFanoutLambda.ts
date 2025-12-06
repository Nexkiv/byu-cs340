import { SQSEvent } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { FollowDAOFactory } from "../../dao/factory/FollowDAOFactory";
import { FeedCacheFanoutMessage } from "../../model/queue/FeedCacheFanoutMessage";
import { FeedCacheBatchWriteMessage } from "../../model/queue/FeedCacheBatchWriteMessage";

const sqsClient = new SQSClient({});
const QUEUE_2_URL = process.env.FEED_CACHE_BATCH_WRITE_QUEUE_URL!;
const BATCH_SIZE = 100;

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log(`[FeedCacheFanoutLambda] Received ${event.Records.length} messages`);

  const followDAO = FollowDAOFactory.create("dynamo");

  for (const record of event.Records) {
    try {
      const message: FeedCacheFanoutMessage = JSON.parse(record.body);
      console.log(`[FeedCacheFanoutLambda] Processing status ${message.status.statusId}`);

      // Stream pagination: fetch ONE page of followers (100 items)
      const [userFollows, hasMore] = await followDAO.getPageOfFollowers(
        message.status.userId,
        message.lastFollowTime,
        message.lastFollowId,
        BATCH_SIZE,
        true // activeOnly
      );

      if (userFollows.length === 0) {
        console.log(`[FeedCacheFanoutLambda] No followers found`);
        continue;
      }

      const followerUserIds = userFollows.map((uf) => uf.user.userId);
      const batchNumber = message.batchesPublished + 1;

      // Publish to Queue 2 for batch writes
      const batchWriteMessage: FeedCacheBatchWriteMessage = {
        status: message.status,
        followerUserIds,
        batchNumber,
      };

      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_2_URL,
          MessageBody: JSON.stringify(batchWriteMessage),
        })
      );

      console.log(
        `[FeedCacheFanoutLambda] Published batch ${batchNumber} with ${followerUserIds.length} followers`
      );

      // If more followers exist, re-enqueue to Queue 1 for next page
      if (hasMore) {
        const lastItem = userFollows[userFollows.length - 1];
        const nextMessage: FeedCacheFanoutMessage = {
          status: message.status,
          lastFollowTime: lastItem.followTime,
          lastFollowId: lastItem.followId,
          batchesPublished: batchNumber,
        };

        await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: process.env.FEED_CACHE_FANOUT_QUEUE_URL!,
            MessageBody: JSON.stringify(nextMessage),
          })
        );

        console.log(`[FeedCacheFanoutLambda] Re-enqueued for next page`);
      } else {
        console.log(
          `[FeedCacheFanoutLambda] Completed (${batchNumber} batches total)`
        );
      }
    } catch (error) {
      console.error(`[FeedCacheFanoutLambda] Error:`, error);
      throw error; // Let SQS retry via visibility timeout
    }
  }
};
