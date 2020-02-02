export type Request = {
  name: string;
};

export type Folder = {
  name: string;
  requests: Request[];
};

export type Collection = {
  name: string;
  folders: Folder[];
  Request: Request[];
};
