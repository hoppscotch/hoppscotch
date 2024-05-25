export type TestCmdOptions = {
  env?: string;
  delay?: string;
  token?: string;
  server?: string;
};

// Consumed in `--env, -e` flag action handler
export type TestCmdOptionsWithRequiredEnv = Omit<TestCmdOptions, "env"> & {
  env: string;
};

export type HOPP_ENV_FILE_EXT = "json";
