import Dexie, { type Table } from 'dexie';
import type { AppStyles } from './styleStore';

export type Project = {
  id?: number;
  name: string;
  markdown: string;
  styles: AppStyles;
  createdAt: Date;
  updatedAt: Date;
}

export class MySubClassedDexie extends Dexie {
  projects!: Table<Project>; 

  constructor() {
    super('markdownH5EditorDB');
    this.version(1).stores({
      projects: '++id, name, updatedAt' // Primary key and indexed props
    });
  }
}

export const db = new MySubClassedDexie();
