import { inject, provide, ref, type InjectionKey, type Ref } from 'vue';

/* ------------------------------------------------------------------ *
 * Config validation engine — edition-agnostic core.
 *
 * SHARED VERBATIM between the community (SHC) and enterprise (SHE)
 * admin apps. Holds NO knowledge of specific tabs, sections, or the
 * `ServerConfigs` shape — those live in the per-edition `configs.ts`
 * (data) and `core-rules.ts` / `enterprise-rules.ts` (rules). Keeping
 * this file byte-identical in both repos is what lets community→
 * enterprise merges stay conflict-free, so never import an
 * edition-specific type here.
 * ------------------------------------------------------------------ */

// What's wrong with a value; maps via GUARD_BY_KIND to its save guard / toast.
export type ConfigIssueKind =
  | 'empty' // required field left blank
  | 'invalid-number' // numeric field present but not a positive integer (>= 1)
  | 'invalid-format' // value present but malformed (e.g. proxy / SMTP URL)
  | 'incomplete'; // interdependent pair only half-filled (SMTP user/pass)

export type ConfigGuard = 'required' | 'format' | 'smtp-pair';

// `invalid-number` sits with `invalid-format` under the `format` guard, not
// `required`: the field isn't empty, it holds a bad value, so it should tip the
// "invalid values" toast rather than "fill all the fields". Only truly blank
// fields (`empty`) map to `required`.
const GUARD_BY_KIND: Record<ConfigIssueKind, ConfigGuard> = {
  empty: 'required',
  'invalid-number': 'format',
  'invalid-format': 'format',
  incomplete: 'smtp-pair',
};

// Edition-generic issue shape. Each repo pins the tab/sub-tab/section unions
// via its `index.ts` (community = core only; enterprise = core ∪ enterprise),
// preserving literal-union exhaustiveness without forking this file.
export type ConfigValidationIssue<
  TTab extends string = string,
  TSubTab extends string = string,
  TSection extends string = string,
> = {
  tab: TTab;
  subTab?: TSubTab;
  section: TSection;
  fieldKey: string;
  envVar: string; // matching InfraConfig env var, e.g. PROXY_APP_URL
  kind: ConfigIssueKind;
};

// A section validator inspects the whole config and returns the issues it owns.
// Composition (which validators run) lives in each repo's `index.ts`.
export type SectionValidator<
  TConfig,
  TIssue extends ConfigValidationIssue = ConfigValidationIssue,
> = (config: TConfig) => TIssue[];

// Runs every validator and flattens the result — the single entry point each
// repo's `getConfigValidationIssues` delegates to.
export const runSectionValidators = <
  TConfig,
  TIssue extends ConfigValidationIssue,
>(
  config: TConfig,
  validators: SectionValidator<TConfig, TIssue>[]
): TIssue[] => validators.flatMap((validate) => validate(config));

/* ------------------------------------------------------------------ *
 * Field-level primitives — pure, shared by every rule module.
 * ------------------------------------------------------------------ */

export const isFieldEmpty = (field: string | boolean | number): boolean => {
  if (typeof field === 'boolean' || typeof field === 'number') return false;
  return field.trim() === '';
};

// Numeric rule: the backend requires positive integers (>= 1) for the validity
// / rate-limit fields, so blanks, non-numerics, decimals, zero, and negatives
// are all invalid. Boolean short-circuits to valid to keep the shared
// field-union signature (these fields are always numeric in practice).
export const isNotValidNumber = (field: string | boolean | number): boolean => {
  if (typeof field === 'boolean') return false;
  const num = typeof field === 'number' ? field : Number(field.trim());
  if (!Number.isFinite(num)) return true;
  return !Number.isInteger(num) || num < 1;
};

// Mirrors the backend validateUrl regex (packages/hoppscotch-backend/src/utils.ts).
// Keep these in sync — the backend rejects PROXY_APP_URL values that don't match.
export const PROXY_URL_REGEX = /^(http|https):\/\/[^ "]+$/;

export const isValidProxyUrl = (value: string): boolean =>
  PROXY_URL_REGEX.test(value);

// Distinguishes a blank value ('empty') from a present-but-bad number
// ('invalid-number') so the right toast fires.
export const emptyOrInvalidNumber = (
  value: string | boolean | number
): ConfigIssueKind =>
  typeof value === 'string' && value.trim() === ''
    ? 'empty'
    : 'invalid-number';

// Resolves a field key to its backend env var name. Structurally typed (no
// dependency on the edition-specific `Config` type) so this file stays
// edition-agnostic; any `{ name; key }` list (e.g. GOOGLE_CONFIGS) is accepted.
export const lookupEnvVar = (
  configs: ReadonlyArray<{ name: string; key?: string }>,
  key: string
): string => configs.find((cfg) => cfg.key === key)?.name ?? '';

/* ------------------------------------------------------------------ *
 * Guard + tab queries — derive UI / save state from an issue list.
 * ------------------------------------------------------------------ */

// True when any issue maps to the given save guard.
export const hasGuardIssue = (
  issues: ConfigValidationIssue[],
  guard: ConfigGuard
): boolean => issues.some((issue) => GUARD_BY_KIND[issue.kind] === guard);

// Proactive — drives indicator dots without waiting for a save attempt. Tab /
// sub-tab are plain strings here (callers narrow them to their edition's
// unions) so this stays edition-agnostic.
export const tabHasConfigIssue = (
  issues: ConfigValidationIssue[],
  tab: string,
  subTab?: string
): boolean =>
  issues.some(
    (issue) => issue.tab === tab && (!subTab || issue.subTab === subTab)
  );

/* ------------------------------------------------------------------ *
 * provide/inject — validation state shared from settings.vue to its
 * config child components. A factory so each repo instantiates ONE
 * fresh InjectionKey (in index.ts) typed to its own issue union;
 * components then read it via the returned `useConfigValidation`.
 *
 * Provide/inject (not module-level singletons) so a consumer mounted
 * without a provider throws loudly instead of silently reading empty
 * state.
 * ------------------------------------------------------------------ */
export type ConfigValidationContext<
  TIssue extends ConfigValidationIssue = ConfigValidationIssue,
> = {
  // Mirrors `isConfigUpdated`, gating borders so they surface while typing,
  // not on a fresh load.
  configEdited: Ref<boolean>;
  // Rebuilt by a deep watch on `workingConfigs` in settings.vue.
  configValidationIssues: Ref<TIssue[]>;
};

export const createConfigValidation = <
  TIssue extends ConfigValidationIssue,
>() => {
  const key: InjectionKey<ConfigValidationContext<TIssue>> = Symbol(
    'config-validation'
  );

  // Called once by the owner (settings.vue); returns the refs so it can drive
  // its watchers.
  const provideConfigValidation = (): ConfigValidationContext<TIssue> => {
    const context: ConfigValidationContext<TIssue> = {
      configEdited: ref(false),
      configValidationIssues: ref([]) as Ref<TIssue[]>,
    };
    provide(key, context);
    return context;
  };

  // Called by any descendant; throws when no provider is above it, so a
  // consumer outside settings.vue fails loudly instead of silently reading
  // empty state.
  const useConfigValidation = () => {
    const context = inject(key);
    if (!context) {
      throw new Error(
        'useConfigValidation() must be used under a component that called ' +
          'provideConfigValidation() (settings.vue). These config components read ' +
          'validation state from that provider and cannot be mounted standalone.'
      );
    }

    // Border lights up once the form is edited and the field has a live issue.
    const isConfigFieldErrored = (
      section: TIssue['section'],
      fieldKey: string
    ) =>
      context.configEdited.value &&
      context.configValidationIssues.value.some(
        (issue) => issue.section === section && issue.fieldKey === fieldKey
      );

    return { ...context, isConfigFieldErrored };
  };

  return { provideConfigValidation, useConfigValidation };
};
