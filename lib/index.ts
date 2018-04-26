import * as path from "path";
import * as os from "os";
import * as fs from "fs";

import * as inquirer from "inquirer";
import * as dash from "rethinkdbdash";
import chalk from "chalk";

import * as repl from "./commands/repl";
import * as seed from "./commands/seed";

type GlobalOptions = {
  host?: string;
  port?: number;
  auth?: boolean;
  config?: string;
};

type CommandOptions = {
  file?: string;
  quiet?: boolean;
  strong?: boolean;
};

type Connection = {
  ReqlClient: dash.ReqlClient;
  close: () => void;
};

type ConnectionSettings = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
};

const valid_host = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

const open = async ({ host = "127.0.0.1", port = 28015, user = "admin", password }: ConnectionSettings = {}): Promise<Connection> => {
  const close = () => ReqlClient.getPoolMaster().drain();

  if (!host.match(valid_host)) throw new Error(`Invalid host "${host}"`);
  if (port < 0 || port > 65536) throw new Error(`Invalid port "${port}"`);

  let ReqlClient = dash({ silent: true, servers: [{ host, port }], user, password });
  await new Promise(resolve => setTimeout(resolve, 500));

  if (ReqlClient.getPoolMaster().getLength() < 1) {
    close();
    throw new Error(`Unable to establish connection to "${host}:${port}" as "${user}"`);
  }
  return { ReqlClient, close };
};

const defaultConfig: ConnectionSettings = { host: "127.0.0.1", port: 28015, user: "", password: "" };
const configDir: string = path.join(os.homedir(), ".recl");
const configFile: string = path.join(configDir, "config.json");

if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));

const loadConfig = (filename?: string) => {
  if (filename) return require(path.join(process.cwd(), filename));
  return require(configFile);
};

const handleError = (err: string | Error): void => {
  err = err instanceof Error ? err : new Error(err);
  console.log(`${chalk.red("Error:")} ${err.message}`);
  return;
};

const run = async (command: string, { host, port, auth, config }: GlobalOptions = {}, { quiet, strong, file }: CommandOptions = {}): Promise<void> => {
  let configs = loadConfig(config);
  console.log(`Loaded config file ${chalk.green(config ? path.win32.basename(config) : `config.json ${chalk.cyan.bold("(Default)")}`)}`);
  host = host || configs.host || "127.0.0.1";
  port = port || configs.port || 28015;
  let user = "";
  let password = "";
  if (auth) {
    let creds: { [key: string]: any } = await inquirer.prompt([
      { name: "user", message: "Username: ", prefix: "-" },
      { name: "password", message: "Password: ", type: "password", mask: "*", prefix: "-" }
    ]);
    user = creds.user;
    password = creds.password;
  } else {
    user = configs.user || "admin";
    password = configs.password || "";
  }
  let { ReqlClient, close }: Connection = await open({ host, port, user, password });
  console.log(`Connected to RethinkDB @ ${chalk.blue.underline(`${host}:${port}`)} as ${chalk.magenta.bold(user)}`);
  switch (command) {
    case "repl":
      await repl(ReqlClient).catch(handleError);
      break;
    case "seed":
      if (!file) throw new Error("Missing seeding file.");
      await seed(ReqlClient, file, { quiet, strong }).catch(handleError);
      break;
  }
  close();
  return;
};

export = run;
