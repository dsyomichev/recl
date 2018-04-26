declare module "jsome" {
  const jsome: {
    (): (json: { [key: string]: any }, callback?: () => any) => { [key: string]: any };
    parse: (jsonString: string, callback?: () => any) => { [key: string]: any };
    getColoredString: (jsonString: string, callback?: () => any) => string;
  };
  export = jsome;
}
