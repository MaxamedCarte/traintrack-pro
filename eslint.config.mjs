import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "_prototype/**", "next-env.d.ts"] },
  ...next,
];

export default config;
