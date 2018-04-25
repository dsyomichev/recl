"use strict";

const fs = require("fs-extra");
const path = require("path");
const dts = require("dts-generator").default;

const compile = require("./compile");

const dist = path.join(__dirname, "../dist");
const types = path.join(dist, "types");

if (!fs.existsSync(dist)) fs.mkdir(dist);

fs.emptyDirSync(dist);
if (!fs.existsSync(types)) fs.mkdir(types);
fs.copySync(path.join(__dirname, "../lib/assets"), path.join(dist, "assets"));
dts({
  name: "recl",
  project: path.join(__dirname, ".."),
  out: path.join(types, "recl.d.ts")
}).then(() => compile());
