import chalk from "chalk";
import * as path from "path";
import * as fs from "fs";
import * as Spinner from "cli-spinner";
import { ReqlClient } from "rethinkdbdash";
import { noConflict } from "bluebird";

export interface database {
  name: string;
  tables?: Array<table>;
}

export interface table {
  name: string;
  primaryKey?: string;
  shards?: number;
  replicas?: number | { [key: string]: number };
  primaryReplicaTag?: string;
  indexes?: Array<index>;
  documents?: Array<document>;
}

export interface index {
  name: string;
  multi?: boolean;
  geo?: boolean;
}

export interface document {
  object: { [key: string]: any };
  durability?: string;
  returnChanges?: boolean | string;
  conflict?: string;
}

export default class Seeder {
  seed = (reql: ReqlClient, filename: string, { hard = false, quiet = false }: { hard?: boolean; quiet?: boolean } = {}): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      let then = Date.now();
      let spin = new Spinner.Spinner("Seeding... %s");
      let parse: { file: Array<database>; warnings: Array<string> } = await this.parse(filename);
      if (parse.warnings.length > 0) {
        console.log(`File parsed with ${chalk.yellow("warnings")}:`);
        for (let warning of parse.warnings) {
          console.log(` - ${warning}`);
        }
      }
      console.log(`File integrity ${chalk.green("OK")}. Beginning seed using file "${path.win32.basename(filename)}"`);
      if (quiet) spin.start();
      let dbList = await reql.dbList().run();
      for (let db of parse.file) {
        if (hard && dbList.includes(db.name)) {
          await reql.dbDrop(db.name).run();
          dbList.splice(dbList.indexOf(db.name), 1);
          if (!quiet) console.log(`Dropped database "${db.name}"`);
        }
        if (!dbList.includes(db.name)) {
          await reql.dbCreate(db.name).run();
          dbList.push(db.name);
          if (!quiet) console.log(`Created database "${db.name}"`);
        }

        let tableList = await reql
          .db(db.name)
          .tableList()
          .run();

        for (let table of db.tables || []) {
          if (!tableList.includes(table.name)) {
            let table_options: { primaryKey?: string; shards?: number; replicas?: number | { [key: string]: number }; primaryReplicaTag?: string } = {
              primaryKey: table.primaryKey || "id"
            };
            if (table.shards) table_options["shards"] = table.shards;
            if (table.replicas && typeof table.replicas == "number") table_options["replicas"] = table.replicas;
            else if (table.replicas && typeof table.replicas == "object") {
              table_options["replicas"] = table.replicas;
              table_options["primaryReplicaTag"] = table.primaryReplicaTag;
            }
            await reql
              .db(db.name)
              .tableCreate(table.name, table_options)
              .run();
            tableList.push(table.name);
            if (!quiet) console.log(`Created table "${table.name}:${table.primaryKey}"`);
          }

          let indexList = await reql
            .db(db.name)
            .table(table.name)
            .indexList()
            .run();

          for (let index of table.indexes || []) {
            if (!indexList.includes(index.name)) {
              let index_options: { multi?: boolean; geo?: boolean } = {};
              if (index.multi) index_options["multi"] = index.multi;
              if (index.geo) index_options["multi"] = index.geo;
              await reql
                .db(db.name)
                .table(table.name)
                .indexCreate(index.name, index_options);
              indexList.push(index.name);
              if (!quiet) console.log(`Created index "${table.name}:${index.name}"`);
            }
          }
          for (let document of table.documents || []) {
            let document_options: { durability?: string; returnChanges?: boolean | string; conflict?: string } = { conflict: document.conflict || "update" };
            if (document.durability) document_options.durability = document.durability;
            if (document.returnChanges) document_options.returnChanges = document.returnChanges;

            await reql
              .db(db.name)
              .table(table.name)
              .insert(document.object, document_options)
              .run();
            if (!quiet) console.log(`Inserted document "${table.name}[${document.object[table.primaryKey || "id"]}]"`);
          }
        }
      }
      if (quiet) spin.stop(true);
      console.log(`Seeding completed in ${chalk.green(`${Date.now() - then}ms.`)}`);
      return resolve();
    });
  };

  parse = (filename: string): Promise<{ file: Array<database>; warnings: Array<string> }> => {
    return new Promise(async (resolve, reject) => {
      if (!filename.match(/\.(js|json)$/i)) return reject(new Error(`Invalid file format "${filename.match(/\.[0-9a-z]+$/i)}" (${filename})`));
      let file: Array<database> = require(path.join(process.cwd(), filename));

      if (!Array.isArray(file)) return reject(`File contents should be of type Array`);
      let warnings = [];
      let db_count = 0;
      for (let db of file) {
        if (!db.name) return reject(`Missing value "name" | db:${db_count}`);
        if (typeof db.name != "string") return reject(`Value "name should be of type String" | db:${db_count}`);
        if (db.tables && !Array.isArray(db.tables)) return reject(`(Parse Value) Value "tables" should be of type Array | db:${db_count}`);
        let table_count = 0;
        for (let table of db.tables || []) {
          if (!table.name) return reject(`Missing value "name" | table:${table_count} db:${db_count}`);
          if (typeof table.name != "string") return reject(`Value "name" should be of type String | table:${table_count} db:${db_count}`);
          if (!table.primaryKey) warnings.push(`(Parse Warning)  Value "primaryKey" not provided. | Set to default "id" `);
          table.primaryKey = table.primaryKey || "id";
          if (typeof table.primaryKey != "string") return reject(`Value "primaryKey" should be of type String | table:${table_count} db:${db_count}`);
          if (table.shards && typeof table.shards != "number") return reject(`Value "shards" should be of type Integer | table:${table_count} db:${db_count}`);
          if (table.shards && (table.shards > 64 || table.shards < 1)) return reject(`Value "shards" should be between 1-64 | table:${table_count} db:${db_count}`);
          if (table.replicas && typeof table.replicas != "number" && typeof table.replicas != "object")
            return reject(`Value "shards" should be of type Integer or Object | table:${table_count} db:${db_count}`);
          if (typeof table.replicas == "number" && table.primaryReplicaTag)
            return reject(`Value "primaryReplicaTag" should not exist when value "replicas" is of type Integer | table:${table_count} db:${db_count}`);
          if (typeof table.replicas == "object" && !table.primaryReplicaTag)
            return reject(`Value "primaryReplicaTag" should exist when value "replicas" is of type Object | table:${table_count} db:${db_count}`);
          if (table.primaryReplicaTag && typeof table.primaryReplicaTag != "number")
            return reject(`Value "primaryReplicaTag" should be of type Integer | table:${table_count} db:${db_count}`);
          if (table.indexes && !Array.isArray(table.indexes)) return reject(`Value "indexes" should be of type Array | table:${table_count} db:${db_count}`);
          let index_count = 0;
          for (let index of table.indexes || []) {
            if (!index.name) return reject(`Missing value "name" | index:${index_count} table:${table_count} db:${db_count}`);
            if (typeof index.name != "string") return reject(`Value "name" should be of type String | index:${index_count} table:${table_count} db:${db_count}`);
            if (index.multi && typeof index.multi != "boolean") return reject(`Value "multi" should be of type Boolean | index:${index_count} table:${table_count} db:${db_count}`);
            if (index.geo && typeof index.geo != "boolean") return reject(`Value "geo" should be of type Boolean | index:${index_count} table:${table_count} db:${db_count}`);
          }
          let doc_count = 0;
          for (let doc of table.documents || []) {
            if (!doc.object) return reject(`Missing value "object" | document:${doc_count} table:${table_count} db:${db_count}`);
            if (!doc.object[table.primaryKey]) return reject(`Missing primary key in object | document:${doc_count} table:${table_count} db:${db_count}`);
            if (doc.durability && typeof doc.durability != "string")
              return reject(`Value "durability" should be of type String | document:${doc_count} table:${table_count} db:${db_count}`);
            if (doc.durability && doc.durability != "hard" && doc.durability != "soft")
              return reject(`Value "durability" should be "soft" or "hard" | document:${doc_count} table:${table_count} db:${db_count}`);
            if (doc.returnChanges && typeof doc.returnChanges != "boolean" && typeof doc.returnChanges != "string")
              return reject(`Value "durability" should be of type Boolean or String | document:${doc_count} table:${table_count} db:${db_count}`);
            if (doc.returnChanges && typeof doc.returnChanges == "string" && doc.returnChanges != "all")
              return reject(`Value "returnChanges" should be "all" when of type String | document:${doc_count} table:${table_count} db:${db_count}`);
            if (doc.conflict && typeof doc.conflict != "string")
              return reject(`Value "conflict" should be of type String | document:${doc_count} table:${table_count} db:${db_count}`);
            if (doc.conflict && typeof doc.conflict == "string" && doc.conflict != "error" && doc.conflict != "replace" && doc.conflict != "update")
              return reject(`Value "conflict" should be "error" or "replace" or "update" when of type String | document:${doc_count} table:${table_count} db:${db_count}`);
          }
        }
        db_count++;
      }
      return resolve({ file, warnings });
    });
  };
}
