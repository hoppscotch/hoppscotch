import * as E from 'fp-ts/Either';
import { EmailCodec } from '~/helpers/Email';
import axios, { AxiosResponse } from 'axios';
import {
  REQ_FAILED,
  EMAIL_NOT_FOUND,
  INVALID_EMAIL,
  SUBSCRIBER_ALREADY_EXISTS,
} from '~/helpers/errors';

enum HttpStatus {
  BAD_REQUEST = 400,
  CONFLICT = 409,
  NOT_FOUND = 404,
}

export type ResponseError = {
  message: string;
  statusCode: HttpStatus;
};

const handleResponse = (response: AxiosResponse) => {
  if (response.status >= 200 && response.status < 300) {
    return E.right(response.data);
  } else {
    return E.left(<ResponseError>{
      statusCode: HttpStatus.BAD_REQUEST,
      message: REQ_FAILED,
    });
  }
};

const listmonkConfig = {
  baseURL: `sdsd`,
  apiURL: `sfs`,
  listmonkUsername: `fsdfs`,
  listmonkPassword: `fdsf`,
  newsletterListID: parseInt('fasf', 10),
};

const listmonk = axios.create({
  baseURL: listmonkConfig.apiURL,
  auth: {
    username: listmonkConfig.listmonkUsername,
    password: listmonkConfig.listmonkPassword,
  },
});
const castToSubscriber = (subscriberResponse: any) => {
  return {
    id: subscriberResponse.id,
    created_at: subscriberResponse.created_at,
    updated_at: subscriberResponse.updated_at,
    uuid: subscriberResponse.uuid,
    email: subscriberResponse.email,
    name: subscriberResponse.name,
    status: subscriberResponse.status,
    lists: subscriberResponse.lists.map((list: any) => ({
      subscription_status: list.subscription_status,
      subscription_created_at: list.subscription_created_at,
      subscription_updated_at: list.subscription_updated_at,
      id: list.id,
    })),
  };
};

const fetchSubscriberDetailsByEmail = async (emailID: string) => {
  const subscribersURL = `${listmonkConfig.apiURL}/subscribers`;
  const params = {
    query: `email = '${emailID}'`,
  };
  try {
    const response = await listmonk.get(subscribersURL, {
      params: params,
    });
    if (response.status >= 200 && response.status < 300) {
      // check length of response results array
      if (!response.data.data.results.length) {
        return E.left(<ResponseError>{
          statusCode: HttpStatus.NOT_FOUND,
          message: EMAIL_NOT_FOUND,
        });
      }

      // fetch subscriber data from response results array object and typecast to `Subscriber` type.
      const subscriberRes = response.data.data.results[0];
      const subscriber = castToSubscriber(subscriberRes);
      return E.right(subscriber);
    } else {
      return E.left(<ResponseError>{
        statusCode: HttpStatus.BAD_REQUEST,
        message: REQ_FAILED,
      });
    }
  } catch (err: any) {
    return E.left(<ResponseError>{
      message: err.response.statusText,
      statusCode: err.response.status,
    });
  }
};

export const addSubscriberNewsletterList = async (
  emailID: string,
  subscriberName: string
) => {
  // Validate email
  const isEmailValid = EmailCodec.is(emailID);
  if (!isEmailValid)
    return E.left(<ResponseError>{
      message: INVALID_EMAIL,
      statusCode: HttpStatus.BAD_REQUEST,
    });

  // Check if subscriber already exists
  const subscriber = await fetchSubscriberDetailsByEmail(emailID);
  if (E.isRight(subscriber)) {
    return E.left(<ResponseError>{
      message: SUBSCRIBER_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }

  // Add a new subscriber to newsletter
  const addSubscriberURL = `${listmonkConfig.apiURL}/subscribers`;
  const reqData = {
    email: `${emailID}`,
    name: `${subscriberName}`,
    status: 'enabled',
    lists: [listmonkConfig.newsletterListID],
    preconfirm_subscriptions: true,
  };

  try {
    const response = await listmonk.post(addSubscriberURL, reqData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response);
  } catch (err: any) {
    return E.left(<ResponseError>{
      message: err.response.statusText,
      statusCode: err.response.status,
    });
  }
};
