import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import * as inquirer from "inquirer";

import Connection from "./components/Connection";
import REPL from "./components/REPL";
import Seeder from "./components/Seeder";
import { ReqlClient } from "rethinkdbdash";

export interface GlobalOptions {
  host?: string;
  port?: number;
  auth?: boolean;
}

export interface CommandOptions {
  file?: string;
  quiet?: boolean;
  hard?: boolean;
}

export interface Config {
  host: string;
  port: number;
  user: string;
  password: string;
}

const handleError = (err: string | Error) => {
  err = err instanceof Error ? err : new Error(err);
  console.log(`${chalk.red("Error: ")}${err.message}`);
};

const loadConfig = (filename?: string): Config => {
  let config_dir: string = `${process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"]}/.recl`;
  let config_file: string = path.join(config_dir, "config.json");
  let default_config: Config = { user: "", password: "", host: "127.0.0.1", port: 28015 };
  if (!fs.existsSync(config_dir)) fs.mkdirSync(config_dir);
  if (!fs.existsSync(config_file)) fs.writeFileSync(config_file, JSON.stringify(default_config, null, 2));
  let config: Config = require(path.resolve(filename ? path.join(process.cwd(), filename) : config_file));
  console.log(`Loaded config file ${chalk.red(path.win32.basename(filename || config_file))}`);
  return config;
};

const run = async (command: string, { host, port, auth }: GlobalOptions, { file, quiet, hard }: CommandOptions): Promise<void> => {
  const connection = new Connection();
  let config = loadConfig();
  host = host || config.host || "127.0.0.1";
  port = port || config.port || 28015;
  let user: string = "";
  let password: string = "";
  if (auth) {
    let creds: { [key: string]: any } = await inquirer.prompt([
      { name: "user", message: "Username: ", prefix: "-" },
      { name: "password", message: "Password: ", type: "password", mask: "*", prefix: "-" }
    ]);
    user = creds.user;
    password = creds.password;
  } else {
    if (config.user) user = config.user;
    if (config.password) password = config.password;
  }
  let reql: Promise<ReqlClient> | ReqlClient = connection.open({ host, port, user, password });
  try {
    reql = await reql;
  } catch (err) {
    handleError(err);
    process.exit();
    return;
  }
  console.log(`Connected to RethinkDB @ ${chalk.blue(`${host}:${port}`)} as ${chalk.green(user)}`);
  switch (command) {
    case "seed":
      if (!file) throw new Error("Missing seeding file.");
      try {
        await new Seeder().seed(reql, file, { quiet, hard });
      } catch (err) {
        handleError(err);
      }
      connection.close();
      process.exit();
      break;
    case "repl":
      try {
        await new REPL().start(reql);
      } catch (err) {
        handleError(err);
      }
      connection.close();
      process.exit();
      break;
  }
  return;
};

export default run;
