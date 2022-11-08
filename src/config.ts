// import TOML from 'toml';
// import {
//   existsSync,
//   readFileSync
// } from 'fs';
import { parseArgs } from "util";

export const args = parseArgs({
  options: {
    "error-display-style": {
      type: "string",
    },
    "error-limit": {
      type: "string",
    },
  },
  allowPositionals: true,
  args: process.argv.slice(2),
});

// temporary disabled
// export const toml = existsSync('Core.toml') ?
//   TOML.parse(readFileSync('Core.toml').toString()) :
//   {};

export const toml = {};

export const config = {
  error: {
    displayStyle:
      args.values["error-display-style"] ||
      toml.config?.error?.["display-style"] ||
      "default",
    limit: parseInt(
      args.values["error-limit"] || toml.config?.error?.["limit"] || 25
    ),
  },
};
