export type MailDescription = {
  template: 'team-invitation';
  variables: {
    invitee: string;
    invite_team_name: string;
    action_url: string;
  };
};

export type UserMagicLinkMailDescription = {
  template: 'code-your-own'; //Alias of template in Postmark, change this to env variable
  variables: {
    inviteeEmail: string;
    magicLink: string;
  };
};
