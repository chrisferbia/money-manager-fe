import type { Account, Category } from "../types";

export function createNameMaps(accounts: Account[], categories: Category[]) {
	return {
		accountNames: new Map(accounts.map((item) => [item.id, item.name])),
		categoryNames: new Map(categories.map((item) => [item.id, item.name])),
	};
}
