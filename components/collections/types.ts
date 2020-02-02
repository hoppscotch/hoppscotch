export type Request = {
  name: string;
};

export type Folder = {
  name: string;
  requests: Request[];
};
