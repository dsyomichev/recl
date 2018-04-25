# ReCL - Rethink Command Line

ReCL is a utility that allows for quick scaling of a RethinkDB database. Seed with data and documents, evaluate rethink statements in the console, and more.

While data exploration tools do exist, I found them tedious and annoying to use to enter large amounts of data such as configurations, exprecially in a development environment. With plenty of configurations, ReCL can quickly build up a database from a single `.js` or `.json` file, rather than entering the data by hand.

### Installing

The utility can be installed using npm or yarn.

```
npm install -g recl
yarn global add recl
```

# Interactive Console - REPL

Simply running the cli in the command line, without any commands, starts a REPL. This is the key to quick interactions with RethinkDB. The commands are exactly like the rethink JavaScript driver. Simply enter the queries in the `r.db("dbName")...` format. If successful, a prettyprinted and highlighted output will be printed with the result. For example, to get a document with an ID of 12345, from the table "users", and the database "info", `r.db("info").table("users").get(12345)` should be run. Whatever the result from RethinkDB will be, it will be printed in the console.

```
Connected to RethinkDB @ localhost:28015
>  r.db("info").table("users").get(12345)
>> Completed in 117ms.
    [Document object goes here.]
>  r.db("info").table("users")
>> Completed in 99ms.
    [Table object goes here.]
>  
```

# Commands

This is a list of all the commands available.

## seed <file> [options]

This command will take an input of a `.js` or `.json` file, load and parse it, and if everything is read properly, the data is seeded into the database. Creates databases, tables, seconday indexes and inserts documents, all with the full control as doing it with the driver.

```
Format:
seed <file> [options]

Options:
-H, --hard  Clear all databases from RethinkDB before seed.
-q, --quiet Prevent logging of queries run during seed.
```

If the file provided is a `.js` file, the file should be using `module.exports =` to export and array of database objects, the format for which can be found in [seed_format.md](./doc/seed.format.md). When a `.json` file is provided the result will be parsed, and then loaded. The file should still contain a single array.

#### Example Input

```javascript
module.exports = [
  {
    name: "info",
    tables: [
      {
        name: "users",
        primaryKey: "id",
        secondary: [
          {
            name: "hello"
          }
        ],
        documents: [
          {
            object: {
              id: "1234567890",
              token: "123",
              access: "123",
              refresh: "123",
              settings: { hide: true }
            }
          }
        ]
      }
    ]
  }
];
```

## Built With

* [RethinkDB](https://github.com/neumino/rethinkdbdash) - Database this was created for.
* [RethinkDBDash](https://github.com/rethinkdb/rethinkdb) - Database driver for interacting with RethinkDB.
* [Commander](https://github.com/tj/commander.js/) - Command framework for parsing commands.
* [Inquirer](https://github.com/SBoudrias/Inquirer.js) - Prompting tool.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details