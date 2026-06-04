import { ServerConfigs } from '../configs';
import {
  CORE_RULES,
  CoreConfigSectionId,
  CoreConfigSubTab,
  CoreConfigTab,
} from './core-rules';
import {
  ConfigValidationIssue as ConfigValidationIssueBase,
  createConfigValidation,
  runSectionValidators,
} from './engine';

/* ------------------------------------------------------------------ *
 * Composition root — COMMUNITY edition.
 *
 * The ONLY file under `config-validation/` that differs between SHC and
 * SHE. It pins this edition's tab/section unions and the validator set;
 * `engine.ts` + `core-rules.ts` stay byte-identical across repos so
 * merges only ever touch this tiny file. The enterprise copy widens the
 * unions and appends `ENTERPRISE_RULES` to the composition.
 * ------------------------------------------------------------------ */

export type ConfigTab = CoreConfigTab;
export type ConfigSubTab = CoreConfigSubTab;
export type ConfigSectionId = CoreConfigSectionId;

export type ConfigValidationIssue = ConfigValidationIssueBase<
  ConfigTab,
  ConfigSubTab,
  ConfigSectionId
>;

// Single source of truth — every save guard, tab dot, field border, and
// console diagnostic derives from this.
export const getConfigValidationIssues = (
  config: ServerConfigs
): ConfigValidationIssue[] => runSectionValidators(config, CORE_RULES);

// One InjectionKey for the whole app, typed to this edition's issue union.
export const { provideConfigValidation, useConfigValidation } =
  createConfigValidation<ConfigValidationIssue>();

export {
  PROXY_URL_REGEX,
  hasGuardIssue,
  isFieldEmpty,
  isNotValidNumber,
  isValidProxyUrl,
  tabHasConfigIssue,
} from './engine';

export type {
  ConfigGuard,
  ConfigIssueKind,
  ConfigValidationContext,
  SectionValidator,
} from './engine';
