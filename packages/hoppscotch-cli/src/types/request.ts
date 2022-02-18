export type Environment = {
  name: string;
  variables: {
    key: string;
    value: string;
  }[];
};

export type RawKeyValueEntry = {
  key: string;
  value: string;
  active: boolean;
};

export type FormDataEntry = {
  key: string;
  value: string | Blob;
};
