import Dexie, { type Table } from 'dexie';
import type { Brew, Bag } from './types';

class BrewDatabase extends Dexie {
	brews!: Table<Brew, string>;
	bags!: Table<Bag, string>;

	constructor() {
		super('CoffeeBrewLog');
		this.version(1).stores({
			brews: 'id, brewedAt, method'
		});
		this.version(2).stores({
			brews: 'id, brewedAt, method, isFavorite'
		});
		this.version(3).stores({
			brews: 'id, brewedAt, method, isFavorite, bagId',
			bags: 'id, createdAt, name'
		});
	}
}

export const db = new BrewDatabase();
