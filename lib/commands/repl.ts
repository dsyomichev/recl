import { ReqlClient } from "rethinkdbdash";
import * as inquirer from "inquirer";
import chalk from "chalk";
import * as jsome from "jsome";
import * as boxen from "boxen";

inquirer.registerPrompt("command", require("inquirer-command-prompt"));

const command_list = require("../assets/commands.json");

const repl = async (r: ReqlClient): Promise<void> => {
  while (true) {
    let prompt: { [key: string]: any } = await inquirer.prompt([{ type: "command", name: "query", message: "\u200b", prefix: ">" }]);
    if (prompt.query == "close") return;
    let validity: string | boolean = validate(prompt.query);
    if (validity !== true) {
      console.log(`${chalk.red(">>")} ${validity}`);
      continue;
    }
    console.log(await evaluate(r, prompt.query));
  }
};

const validate = (query: string): string | boolean => {
  if (query.slice(0, 2) != "r.") return "Invalid query. | Should begin with 'r.' (eg. r.db('dbName'))";
  let commands = query.slice(2).split(".");
  for (let command of commands) {
    let err = `Invalid statment. | "${command}" is not valid`;
    if (command.indexOf("(") == -1) return err;
    if (command.indexOf(")") == -1) return err;
    if (!command_list.includes(command.slice(0, command.indexOf("(")))) return `Invalid command. | "${command}" is not valid.`;
  }
  return true;
};

const evaluate = async (r: ReqlClient, query: string): Promise<string> => {
  let then = Date.now();
  let result;
  try {
    result = await eval(query);
  } catch (err) {
    return `${chalk.red(">>")} ${err.message}`;
  }
  result = typeof result == "object" ? jsome.getColoredString(result) : result;
  return `${chalk.green(">>")} Completed in ${chalk.green(`${Date.now() - then}ms.`)}\n${boxen(result, { padding: 1 })}\n`;
};

export = repl;
