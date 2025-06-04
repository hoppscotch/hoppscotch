import { BasicAuthStrategy } from "./strategies/BasicAuthStrategy"
import { BearerAuthStrategy } from "./strategies/BearerAuthStrategy"
import { ApiKeyAuthStrategy } from "./strategies/ApiKeyAuthStrategy"
import { OAuth2AuthStrategy } from "./strategies/OAuth2AuthStrategy"
import { DigestAuthStrategy } from "./strategies/DigestAuthStrategy"
import { AwsSignatureAuthStrategy } from "./strategies/AwsSignatureAuthStrategy"
import { HawkAuthStrategy } from "./strategies/HawkAuthStrategy"
import { JwtAuthStrategy } from "./strategies/JwtAuthStrategy"
import {
  Environment,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTRequest,
} from "@hoppscotch/data"

export interface AuthStrategy {
  /**
   * The auth type this strategy handles
   */
  readonly authType: string

  /**
   * Generate headers for this auth type
   */
  generateHeaders(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret?: boolean
  ): Promise<HoppRESTHeader[]>

  /**
   * Generate query parameters for this auth type
   */
  generateParams(
    auth: HoppRESTAuth,
    request: HoppRESTRequest,
    envVars: Environment["variables"],
    showKeyIfSecret?: boolean
  ): Promise<HoppRESTParam[]>

  /**
   * Check if this auth strategy conflicts with existing headers
   */
  hasConflict(auth: HoppRESTAuth, existingHeaders: HoppRESTHeader[]): boolean
}

export class AuthRegistry {
  private strategies = new Map<string, AuthStrategy>()

  constructor() {
    this.registerDefaultStrategies()
  }

  private registerDefaultStrategies() {
    this.register(new BasicAuthStrategy())
    this.register(new BearerAuthStrategy())
    this.register(new ApiKeyAuthStrategy())
    this.register(new OAuth2AuthStrategy())
    this.register(new DigestAuthStrategy())
    this.register(new AwsSignatureAuthStrategy())
    this.register(new HawkAuthStrategy())
    this.register(new JwtAuthStrategy())
  }

  register(strategy: AuthStrategy) {
    this.strategies.set(strategy.authType, strategy)
  }

  getStrategy(authType: string): AuthStrategy | undefined {
    return this.strategies.get(authType)
  }

  getAllStrategies(): AuthStrategy[] {
    return Array.from(this.strategies.values())
  }

  hasStrategy(authType: string): boolean {
    return this.strategies.has(authType)
  }

  unregister(authType: string): boolean {
    return this.strategies.delete(authType)
  }
}

// Export singleton instance
export const authRegistry = new AuthRegistry()
