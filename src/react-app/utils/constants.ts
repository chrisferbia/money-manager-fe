export const accountTypes = [
	"cash",
	"bank",
	"savings",
	"debit_card",
	"credit_card",
	"e_wallet",
	"investment",
	"loan",
	"mortgage",
];

export const accountNameMaxLength = 80;
export const categoryNameMaxLength = 80;

const accountTypeLabels: Record<string, string> = {
	cash: "Cash",
	bank: "Bank",
	savings: "Savings",
	debit_card: "Debit card",
	credit_card: "Credit card",
	e_wallet: "E-wallet",
	investment: "Investment",
	loan: "Loan",
	mortgage: "Mortgage",
};

const accountTypeMarks: Record<string, string> = {
	cash: "$",
	bank: "B",
	savings: "S",
	debit_card: "D",
	credit_card: "C",
	e_wallet: "E",
	investment: "I",
	loan: "L",
	mortgage: "M",
};

export function accountTypeLabel(type: string) {
	return (
		accountTypeLabels[type] ??
		type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
	);
}

export function accountTypeMark(type: string) {
	return accountTypeMarks[type] ?? "A";
}
