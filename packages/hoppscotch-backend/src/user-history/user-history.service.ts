import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { ReqType, UserHistory } from './user-history.model';
import * as E from 'fp-ts/Either';

// Contains constants for the subscription types we send to pubsub service
enum SubscriptionType {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
}

@Injectable()
export class UserHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  /**
   * Fetch users REST or GraphQL history based on ReqType argument.
   * @param uid Users uid
   * @param reqType request Type to fetch i.e. GraphQL or REST
   * @returns an array of user history
   */
  async fetchUserHistory(uid: string, reqType: ReqType) {
    const userHistory = await this.prisma.userHistory.findMany({
      where: {
        userUid: uid,
        type: reqType,
      },
    });

    const userHistoryColl: UserHistory[] = [];
    userHistory.forEach((history) => {
      userHistoryColl.push(<UserHistory>{
        id: history.id,
        userUid: history.userUid,
        reqType: history.type,
        request: JSON.stringify(history.request),
        responseMetadata: JSON.stringify(history.responseMetadata),
        isStarred: history.isStarred,
      });
    });

    return userHistoryColl;
  }

  /**
   * Adds a request to users history.
   * @param uid Users uid
   * @param reqData the request data
   * @param resMetadata the response metadata
   * @param reqType request Type to fetch i.e. GraphQL or REST
   * @returns an array of user history
   */
  async addRequestToHistory(
    uid: string,
    reqData: string,
    resMetadata: string,
    reqType: string,
  ) {
    const requestType = this.validateReqType(reqType);
    const history = await this.prisma.userHistory.create({
      data: {
        userUid: uid,
        request: JSON.parse(reqData),
        responseMetadata: JSON.parse(resMetadata),
        type: requestType,
        isStarred: false,
      },
    });

    const userHistory = <UserHistory>{
      id: history.id,
      userUid: history.userUid,
      request: JSON.stringify(history.request),
      responseMetadata: JSON.stringify(history.responseMetadata),
      executedOn: history.executedOn,
      isStarred: history.isStarred,
      reqType: history.type,
    };

    await this.publishUserHistorySubscription(
      userHistory,
      SubscriptionType.Created,
    );

    return userHistory;
  }

  /**
   * Stars or unstars a request in the history
   * @param uid Users uid
   * @param id id of the request in the history
   * @returns an Either of updated `UserHistory` or Error
   */
  async starUnstarRequestInHistory(uid: string, id: string) {
    const userHistory = await this.prisma.userHistory.findFirst({
      where: {
        id: id,
      },
    });

    if (userHistory == null) {
      return E.left('history doesnt exist');
    }
    try {
      const updatedHistory = await this.prisma.userHistory.update({
        where: {
          id: id,
        },
        data: {
          isStarred: !userHistory.isStarred,
        },
      });

      const updatedUserHistory = <UserHistory>{
        id: updatedHistory.id,
        userUid: updatedHistory.userUid,
        request: JSON.stringify(updatedHistory.request),
        responseMetadata: JSON.stringify(updatedHistory.responseMetadata),
        executedOn: updatedHistory.executedOn,
        isStarred: updatedHistory.isStarred,
        reqType: updatedHistory.type,
      };

      await this.publishUserHistorySubscription(
        updatedUserHistory,
        SubscriptionType.Updated,
      );

      return E.right(updatedUserHistory);
    } catch (e) {
      E.left('error updating');
    }
  }

  /**
   * Removes a REST/GraphQL request from the history
   * @param uid Users uid
   * @param id id of the request
   * @returns an Either of deleted `UserHistory` or Error
   */
  async removeRequestFromHistory(uid: string, id: string) {
    try {
      const delUserHistory = await this.prisma.userHistory.delete({
        where: {
          id: id,
        },
      });

      const deletedUserHistory = <UserHistory>{
        id: delUserHistory.id,
        userUid: delUserHistory.userUid,
        request: JSON.stringify(delUserHistory.request),
        responseMetadata: JSON.stringify(delUserHistory.responseMetadata),
        executedOn: delUserHistory.executedOn,
        isStarred: delUserHistory.isStarred,
        reqType: delUserHistory.type,
      };

      await this.publishUserHistorySubscription(
        deletedUserHistory,
        SubscriptionType.Deleted,
      );
      return E.right(deletedUserHistory);
    } catch (e) {
      return E.left('error deleting history not found');
    }
  }

  /**
   * Delete all REST/GraphQl user history based on ReqType
   * @param uid Users uid
   * @param reqType request type to be deleted i.e. REST or GraphQL
   * @returns a count of deleted history
   */
  async deleteAllUserHistory(uid: string, reqType: string) {
    const requestType = this.validateReqType(reqType);
    return await this.prisma.userHistory.deleteMany({
      where: {
        userUid: uid,
        type: requestType,
      },
    });
  }

  // Method that takes a request type argument as string and validates against `ReqType`
  validateReqType(reqType: string) {
    let requestType: ReqType;
    return reqType == ReqType.REST
      ? (requestType = ReqType.REST)
      : (requestType = ReqType.GQL);
  }

  // Method to publish subscriptions based on the subscription type of the history
  async publishUserHistorySubscription(
    userHistory: UserHistory,
    subscriptionType: SubscriptionType,
  ) {
    switch (subscriptionType) {
      case SubscriptionType.Created:
        await this.pubsub.publish(
          `user_history/${userHistory.id}/created`,
          userHistory,
        );
        break;
      case SubscriptionType.Updated:
        await this.pubsub.publish(
          `user_history/${userHistory.id}/updated`,
          userHistory,
        );
        break;
      case SubscriptionType.Deleted:
        await this.pubsub.publish(
          `user_history/${userHistory.id}/deleted`,
          userHistory,
        );
        break;
      default:
        break;
    }
  }
}
