import type { Method, Root, Service, Type } from "protobufjs"

export type GRPCMethodDefinition = {
  serviceName: string
  methodName: string
  path: string
  requestStream: boolean
  responseStream: boolean
  method: Method
  requestType: Type
  responseType: Type
}

export type GRPCServiceDefinition = {
  name: string
  service: Service
  methods: GRPCMethodDefinition[]
}

export type ParsedGRPCSchema = {
  root: Root
  services: GRPCServiceDefinition[]
}

export type GRPCResponseMetadata = {
  key: string
  value: string
}

export type GRPCUnaryResponse = {
  status: number
  statusText: string
  message: string
  metadata: GRPCResponseMetadata[]
  trailers: GRPCResponseMetadata[]
  duration: number
  size: number
}
