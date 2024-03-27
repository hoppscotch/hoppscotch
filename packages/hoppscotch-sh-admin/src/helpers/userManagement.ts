import { useToast } from '~/composables/toast';
import { getI18n } from '~/modules/i18n';
import { UserDeletionResult } from './backend/graphql';
import { ADMIN_CANNOT_BE_DELETED, USER_IS_OWNER } from './errors';

type IndividualActionInput = {
  type: 'individual';
  metadata: null;
};
type BulkActionInput = {
  type: 'bulk';
  metadata: {
    areMultipleUsersSelected: boolean;
    deletedIDs: string[];
  };
};

type IndividualActionResult = {
  data: null;
};
type BulkActionResult = {
  data: { timeoutID: NodeJS.Timeout | null };
};

type HandleUserDeletion = {
  (
    deletedUsersList: UserDeletionResult[],
    action: IndividualActionInput | BulkActionInput
  ): IndividualActionResult | BulkActionResult;
};

const t = getI18n();
const toast = useToast();

export const handleUserDeletion: HandleUserDeletion = (
  deletedUsersList,
  action
) => {
  let timeoutID: NodeJS.Timeout | null = null;

  const uniqueErrorMessages = new Set(
    deletedUsersList.map(({ errorMessage }) => errorMessage).filter(Boolean)
  ) as Set<string>;

  const { type, metadata } = action;

  // Show the success toast based on the action type if there are no errors
  if (uniqueErrorMessages.size === 0) {
    if (type === 'bulk') {
      toast.success(
        metadata.areMultipleUsersSelected
          ? t('state.delete_user_success')
          : t('state.delete_users_success')
      );

      return { type, data: { timeoutID } };
    }

    toast.success(t('state.delete_user_success'));
    return { type, data: null };
  }

  const errMsgMap = {
    [ADMIN_CANNOT_BE_DELETED]:
      type === 'bulk'
        ? t('state.remove_admin_for_deletion')
        : t('state.remove_admin_to_delete_user'),

    [USER_IS_OWNER]:
      type === 'bulk'
        ? t('state.remove_owner_for_deletion')
        : t('state.remove_owner_to_delete_user'),
  };
  const errMsgMapKeys = Object.keys(errMsgMap);

  if (type === 'bulk') {
    const { areMultipleUsersSelected, deletedIDs } = metadata;

    // Show toast messages with the count of users deleted only if multiple users are selected
    if (areMultipleUsersSelected) {
      toast.success(
        t('state.delete_some_users_success', { count: deletedIDs.length })
      );
      toast.error(
        t('state.delete_some_users_failure', {
          count: deletedUsersList.length - deletedIDs.length,
        })
      );
    }
  }

  uniqueErrorMessages.forEach((errorMessage) => {
    if (errMsgMapKeys.includes(errorMessage)) {
      if (type === 'bulk') {
        timeoutID = setTimeout(
          () => {
            toast.error(errMsgMap[errorMessage as keyof typeof errMsgMap]);
          },
          metadata.areMultipleUsersSelected ? 2000 : 0
        );

        return;
      }

      toast.error(errMsgMap[errorMessage as keyof typeof errMsgMap]);
    }
  });

  // Fallback for the case where the error message is not in the compiled list
  if (
    Array.from(uniqueErrorMessages).some(
      (key) => !((key as string) in errMsgMap)
    )
  ) {
    type === 'bulk' && metadata.areMultipleUsersSelected
      ? t('state.delete_users_failure')
      : t('state.delete_user_failure');
  }

  return { data: type === 'bulk' ? { timeoutID } : null };
};
