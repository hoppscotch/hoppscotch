import { useToast } from '~/composables/toast';
import { getI18n } from '~/modules/i18n';
import { UserDeletionResult } from './backend/graphql';
import {
  ADMIN_CANNOT_BE_DELETED,
  USER_IS_OWNER,
  getCompiledErrorMessage,
} from './errors';

type ToastMessage = {
  message: string;
  state: 'success' | 'error';
};

const t = getI18n();
const toast = useToast();

const displayToastMessages = (
  toastMessages: ToastMessage[],
  currentIndex: number
) => {
  const { message, state } = toastMessages[currentIndex];

  toast[state](message, {
    duration: 2000,
    onComplete: () => {
      if (currentIndex < toastMessages.length - 1) {
        displayToastMessages(toastMessages, currentIndex + 1);
      }
    },
  });
};

export const handleUserDeletion = (deletedUsersList: UserDeletionResult[]) => {
  const uniqueErrorMessages = new Set(
    deletedUsersList.map(({ errorMessage }) => errorMessage).filter(Boolean)
  ) as Set<string>;

  const isBulkAction = deletedUsersList.length > 1;

  const deletedUserIDs = deletedUsersList
    .filter((user) => user.isDeleted)
    .map((user) => user.userUID);

  // Show the success toast based on the action type if there are no errors
  if (uniqueErrorMessages.size === 0) {
    toast.success(
      isBulkAction
        ? t('state.delete_users_success')
        : t('state.delete_user_success')
    );
    return;
  }

  const errMsgMap = {
    [ADMIN_CANNOT_BE_DELETED]: t(
      getCompiledErrorMessage(ADMIN_CANNOT_BE_DELETED, isBulkAction)
    ),
    [USER_IS_OWNER]: t(getCompiledErrorMessage(USER_IS_OWNER, isBulkAction)),
  };

  const errMsgMapKeys = Object.keys(errMsgMap);

  const toastMessages: ToastMessage[] = [];

  if (isBulkAction) {
    // Indicates the actual count of users deleted (filtered via the `isDeleted` field)
    const deletedUsersCount = deletedUserIDs.length;

    if (isBulkAction && deletedUsersCount > 0) {
      toastMessages.push({
        message: t('state.delete_some_users_success', {
          count: deletedUsersCount,
        }),
        state: 'success',
      });
    }
    const remainingDeletionsCount = deletedUsersList.length - deletedUsersCount;
    if (remainingDeletionsCount > 0) {
      toastMessages.push({
        message: t('state.delete_some_users_failure', {
          count: remainingDeletionsCount,
        }),
        state: 'error',
      });
    }
  }

  uniqueErrorMessages.forEach((errorMessage) => {
    if (errMsgMapKeys.includes(errorMessage)) {
      toastMessages.push({
        message: errMsgMap[errorMessage as keyof typeof errMsgMap],
        state: 'error',
      });
    }
  });

  // Fallback for the case where the error message is not in the compiled list
  if (
    Array.from(uniqueErrorMessages).some(
      (key) => !((key as string) in errMsgMap)
    )
  ) {
    const fallbackErrMsg = isBulkAction
      ? t('state.delete_users_failure')
      : t('state.delete_user_failure');

    toastMessages.push({
      message: fallbackErrMsg,
      state: 'error',
    });
  }

  displayToastMessages(toastMessages, 0);
};
