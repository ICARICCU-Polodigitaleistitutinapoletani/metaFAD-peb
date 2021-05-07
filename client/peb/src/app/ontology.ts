export class Ontology {
  id: string;
  name: object;
  lastModified: string;
  shared: boolean;
  entities: number;
  terminology: number;
  contents: number;
  imported: string[];
  items: {[k: string]: any}[];
  dataProperties: {[k: string]: any}[];
  uri?: string;
  showEditingUri?: boolean;
  published?: boolean;
}
