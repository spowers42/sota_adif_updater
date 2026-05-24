export interface AdifField {
  name: string;
  value: string;
}

export interface AdifRecord {
  fields: AdifField[];
}

export interface AdifFile {
  headerText: string;
  records: AdifRecord[];
}
