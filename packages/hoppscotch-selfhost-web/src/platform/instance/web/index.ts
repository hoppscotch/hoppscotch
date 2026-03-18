import { Service } from "dioc"
import { Observable, of } from "rxjs"

import {
  Instance,
  ConnectionState,
  OperationResult,
  InstanceKind,
  InstancePlatformDef,
} from "@hoppscotch/common/src/platform/instance"
import { getService } from "@hoppscotch/common/modules/dioc"

export class WebInstanceService
  extends Service<never>
  implements InstancePlatformDef
{
  public static readonly ID = "WEB_INSTANCE_SERVICE"

  /**
   * Disable instance switching for web platform
   */
  public readonly instanceSwitchingEnabled: boolean = false

  /**
   * Web platform doesn't need most of these methods, but we implement them
   * to satisfy the interface contract
   */

  public getConnectionStateStream?(): Observable<ConnectionState> {
    return of({ status: "idle" })
  }

  public getRecentInstancesStream?(): Observable<Instance[]> {
    return of([])
  }

  public getCurrentInstanceStream?(): Observable<Instance | null> {
    return of(null)
  }

  public getCurrentConnectionState?(): ConnectionState {
    return { status: "idle" }
  }

  public getRecentInstances?(): Instance[] {
    return []
  }

  public getCurrentInstance?(): Instance | null {
    return null
  }

  public async connectToInstance?(
    _serverUrl: string,
    _instanceKind: InstanceKind,
    _displayName?: string
  ): Promise<OperationResult> {
    return {
      success: false,
      message: "Instance switching not supported on web platform",
    }
  }

  public async downloadInstance?(
    _serverUrl: string,
    _instanceKind: InstanceKind,
    _displayName?: string
  ): Promise<OperationResult> {
    return {
      success: false,
      message: "Instance downloading not supported on web platform",
    }
  }

  public async loadInstance?(): Promise<OperationResult> {
    return {
      success: false,
      message: "Instance loading not supported on web platform",
    }
  }

  public async removeInstance?(): Promise<OperationResult> {
    return {
      success: false,
      message: "Instance removal not supported on web platform",
    }
  }

  public async disconnect?(): Promise<OperationResult> {
    return {
      success: false,
      message: "Disconnect not supported on web platform",
    }
  }

  public async clearCache?(): Promise<OperationResult> {
    return {
      success: false,
      message: "Cache clearing not supported on web platform",
    }
  }

  public normalizeUrl?(_url: string): string | null {
    return null
  }

  public async validateServerUrl?(): Promise<{
    valid: boolean
    error?: string
  }> {
    return {
      valid: false,
      error: "Server validation not supported on web platform",
    }
  }
}

const webInstanceService = getService(WebInstanceService)

export const def: InstancePlatformDef = webInstanceService
