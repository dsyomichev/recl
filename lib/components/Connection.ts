import * as dash from "rethinkdbdash";

const delay = (timeout: number): Promise<void> => new Promise(resolve => setTimeout(resolve, timeout));

export default class Connection {
  r: dash.ReqlClient;

  open = ({ host = "127.0.0.1", port = 28015, user, password }: { host?: string; port?: number; user?: string; password?: string } = {}): Promise<dash.ReqlClient> => {
    return new Promise(async (resolve, reject) => {
      if (host != "localhost" && !host.match(/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/))
        return reject(new Error(`Invalid host "${host}"`));
      if (port < 0 || port > 65536) return reject(new Error(`Invalid port "${port}"`));
      let options: { [k: string]: any } = {
        host,
        port,
        silent: true
      };
      if (user) options.user = user;
      if (password) options.password = password;
      this.r = dash(options);
      await delay(500);
      if (this.r.getPoolMaster().getLength() < 1) return reject(new Error(`Unable to establish connection to "${host}:${port}"`));
      return resolve(this.r);
    });
  };

  close = (): void => {
    this.r.getPoolMaster().drain();
    return;
  };
}
