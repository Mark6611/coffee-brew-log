import Dexie, { type Table } from 'dexie';
import type { Brew } from './types';

class BrewDatabase extends Dexie {
	brews!: Table<Brew, string>;

	constructor() {
		super('CoffeeBrewLog');
		this.version(1).stores({
			brews: 'id, brewedAt, method'
		});
	}
}

export const db = new BrewDatabase();
