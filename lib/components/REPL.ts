import * as inquirer from "inquirer";
import chalk from "chalk";
import { ReqlClient } from "rethinkdbdash";

/*Untyped modules -- Add typings later.*/
import * as command from "inquirer-command-prompt";
import * as boxen from "boxen";
import * as jsome from "jsome";
/* --- */

const command_list = require("../assets/commands.json");

inquirer.registerPrompt("command", command);

export default class REPL {
  r: ReqlClient;

  start = async (reql: ReqlClient): Promise<void> => {
    this.r = reql;
    for (;;) {
      let prompt: { [k: string]: any } = await inquirer.prompt([{ type: "command", name: "query", message: "\u200b", prefix: ">" }]);
      let val: any = this.validate(prompt.query);
      if (val !== true) {
        console.log(`${chalk.red(">>")} ${val}`);
        continue;
      }
      console.log(await this.evaluate(prompt.query));
    }
  };

  validate = (query: string): string | boolean => {
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

  evaluate = async (query: string): Promise<string> => {
    let then = Date.now();
    let result = eval(`this.${query}`);
    try {
      result = await result;
    } catch (err) {
      return `${chalk.red(">>")} ${err.message}`;
    }
    result = typeof result == "object" ? jsome.getColoredString(result) : result;
    return `${chalk.green(">>")} Completed in ${chalk.green(`${Date.now() - then}ms.`)}\n${boxen(result, { padding: 1 })}\n`;
  };
}
