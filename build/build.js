"use strict";

const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const dts = require("dts-generator").default;

const compile = require("./compile");

const dist = path.join(__dirname, "../dist");
const types = path.join(dist, "types");
const assetsOut = path.join(__dirname, "../lib/assets");
const assetsIn = path.join(dist, "assets");

const typeOptions = {
  name: "recl",
  project: path.join(__dirname, ".."),
  out: path.join(types, "index.d.ts"),
  exclude: ["lib/types/*.ts", "node_modules/**/*"],
  resolveModuleId: ({ currentModuleId }) => {
    if (currentModuleId == "index") return "recl";
  }
};

const build = async quiet => {
  let then = Date.now();
  if (!fs.existsSync(dist)) {
    fs.mkdir(dist);
    if (!quiet) console.log(`${chalk.cyanBright(Date.now() - then)} - Created distribution directory ${chalk.green(dist)}`);
  }

  fs.emptyDirSync(dist);
  if (!quiet) console.log(`${chalk.cyanBright(Date.now() - then)} - Cleared distribution directory ${chalk.magenta(dist)}`);

  if (!fs.existsSync(types)) {
    fs.mkdir(types);
    if (!quiet) console.log(`${chalk.cyanBright(Date.now() - then)} - Created typings directory ${chalk.yellow(types)}`);
  }

  fs.copySync(assetsOut, assetsIn);
  if (!quiet) console.log(`${chalk.cyanBright(Date.now() - then)} - Copied required assets directory ${chalk.red(assetsOut)} to directory ${chalk.red(assetsIn)}`);

  await dts(typeOptions);
  if (!quiet) console.log(`${chalk.cyanBright(Date.now() - then)} - Complied typings into file ${chalk.blue(path.join(types, "index.d.ts"))}`);

  compile();
  if (!quiet) console.log(`${chalk.cyanBright(Date.now() - then)} - Compiled TypeScript source to JavaScript for distribution in directory ${chalk.green(dist)}`);

  return Date.now() - then;
};

if (!module.parent)
  build().then(time => console.log(`Build complete in ${chalk.cyanBright(`${time / 1000}`)} seconds.`), err => console.log(`${chalk.red("Error: ")} ${err.message}`));
else module.exports = build;
