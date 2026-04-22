import { registerEnumType } from "@nestjs/graphql";

export enum ReqType {
  REST = 'REST',
  GQL = 'GQL',
}

registerEnumType(ReqType, {
  name: 'ReqType',
});
