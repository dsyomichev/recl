declare module "boxen" {
  interface Options {
    borderColor?: string;
    borderStyle?: string;
    dimBorder?: boolean;
    padding?: number;
    margin?: number;
    float?: string;
    backgroundColor?: string;
    align?: string;
  }
  const boxen: (text: string, opts: Options) => string;
  export = boxen;
}
