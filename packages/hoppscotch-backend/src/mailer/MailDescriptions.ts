export type MailDescription = {
  template: 'team-invitation';
  variables: {
    invitee: string;
    invite_team_name: string;
    action_url: string;
  };
};

export type UserMagicLinkMailDescription = {
  template: 'code-your-own';
  variables: {
    inviteeEmail: string;
    magicLink: string;
  };
};

export type AdminUserInvitationMailDescription = {
  template: 'code-your-own';
  variables: {
    inviteeEmail: string;
    magicLink: string;
  };
};
